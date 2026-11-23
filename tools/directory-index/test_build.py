import hashlib
import tempfile
import unittest
from pathlib import Path
from urllib.parse import quote

from build import MARKER, build_tree, load_descriptions


def snapshot(root):
    return {
        path.relative_to(root).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in root.rglob("*") if path.is_file() and not path.is_symlink()
    }


class DirectoryIndexesTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name) / "public"
        self.root.mkdir()

    def tearDown(self):
        self.temporary.cleanup()

    def catalog(self, text):
        path = Path(self.temporary.name) / "directory-descriptions.yml"
        path.write_text(text, encoding="utf-8")
        return path

    def test_full_names_escaped_links_and_parent_navigation(self):
        folder = self.root / "Research & teaching"
        folder.mkdir()
        filename = "A complete título with spaces, #questions? & <answers>.pdf"
        (folder / filename).write_bytes(b"unchanged PDF")
        build_tree(self.root, "Shared files")
        parent = (self.root / "index.html").read_text()
        child = (folder / "index.html").read_text()
        self.assertIn('href="Research%20%26%20teaching/"', parent)
        self.assertIn('href="{}"'.format(quote(filename, safe="")), child)
        self.assertIn("A complete título with spaces, #questions? &amp; &lt;answers&gt;.pdf", child)
        self.assertIn('<a href="../">Shared files</a>', child)
        self.assertEqual((folder / filename).read_bytes(), b"unchanged PDF")

    def test_existing_websites_are_not_modified_or_traversed(self):
        site = self.root / "gcw"
        site.mkdir()
        (site / "index.html").write_text("Existing project")
        assets = site / "assets"
        assets.mkdir()
        (assets / "app.js").write_text("Original script")
        before = snapshot(site)
        pages = build_tree(self.root, "Development")
        self.assertEqual(pages, [self.root / "index.html"])
        self.assertEqual(snapshot(site), before)

    def test_idempotence_new_files_and_original_payloads(self):
        (self.root / "paper.pdf").write_bytes(b"paper")
        (self.root / "ordinary.html").write_text("An ordinary HTML file")
        before = snapshot(self.root)
        build_tree(self.root, "PDF files", "Website")
        first = snapshot(self.root)
        modified = (self.root / "index.html").stat().st_mtime_ns
        build_tree(self.root, "PDF files", "Website")
        self.assertEqual(snapshot(self.root), first)
        self.assertEqual((self.root / "index.html").stat().st_mtime_ns, modified)
        for name, digest in before.items():
            self.assertEqual(snapshot(self.root)[name], digest)
        (self.root / "new.pdf").write_bytes(b"new paper")
        build_tree(self.root, "PDF files", "Website")
        content = (self.root / "index.html").read_text()
        self.assertIn('href="new.pdf"', content)
        self.assertIn('<a href="../">Website</a>', content)
        self.assertNotIn('href="index.html"', content)

    def test_renamed_and_deleted_files_disappear_despite_retained_metadata(self):
        original = self.root / "original.pdf"
        original.write_bytes(b"original PDF")
        descriptions = {
            "original.pdf": "Original document description",
            "never-existed.pdf": "Unused catalog entry",
        }
        build_tree(self.root, "PDF files", descriptions=descriptions)
        content = (self.root / "index.html").read_text()
        self.assertIn('href="original.pdf"', content)
        self.assertIn("Original document description", content)
        self.assertNotIn("never-existed.pdf", content)

        renamed = self.root / "renamed.pdf"
        original.rename(renamed)
        build_tree(self.root, "PDF files", descriptions=descriptions)
        content = (self.root / "index.html").read_text()
        self.assertIn('href="renamed.pdf"', content)
        self.assertIn('class="entry-name">renamed.pdf</span>', content)
        self.assertNotIn("original.pdf", content)
        self.assertNotIn("Original document description", content)
        self.assertNotIn("never-existed.pdf", content)
        self.assertEqual(renamed.read_bytes(), b"original PDF")

        renamed.unlink()
        build_tree(self.root, "PDF files", descriptions=descriptions)
        content = (self.root / "index.html").read_text()
        self.assertNotIn('class="entry-link"', content)
        self.assertIn("No files in this folder.", content)
        self.assertIn("Empty folder", content)

    def test_real_website_replaces_owned_listing_without_cleaning_descendants(self):
        folder = self.root / "project"
        child = folder / "files"
        child.mkdir(parents=True)
        (child / "data.csv").write_text("a,b")
        build_tree(self.root, "Development")
        child_before = snapshot(child)
        (folder / "index.php").write_text("New website")
        build_tree(self.root, "Development")
        self.assertFalse((folder / "index.html").exists())
        self.assertEqual((folder / "index.php").read_text(), "New website")
        self.assertEqual(snapshot(child), child_before)

    def test_hidden_entries_and_symlinks_are_excluded(self):
        (self.root / ".private").write_text("Hidden")
        outside = Path(self.temporary.name) / "outside"
        outside.mkdir()
        (outside / "secret.txt").write_text("Outside the public tree")
        (self.root / "linked-folder").symlink_to(outside, target_is_directory=True)
        (self.root / "linked-file").symlink_to(outside / "secret.txt")
        pages = build_tree(self.root, "Files")
        content = (self.root / "index.html").read_text()
        self.assertEqual(len(pages), 1)
        self.assertIn(MARKER, content)
        self.assertNotIn("linked-folder", content)
        self.assertNotIn("linked-file", content)
        self.assertNotIn(".private", content)
        self.assertFalse((outside / "index.html").exists())

    def test_existing_broken_index_symlink_is_preserved(self):
        index = self.root / "index.html"
        index.symlink_to(self.root / "missing-homepage.html")
        self.assertEqual(build_tree(self.root, "Files"), [])
        self.assertTrue(index.is_symlink())

    def test_descriptions_are_optional_escaped_and_reused_for_folder_intro(self):
        (self.root / "folder").mkdir()
        for filename in ["described.pdf", "blank.pdf", "missing.pdf", "null.pdf"]:
            (self.root / filename).write_bytes(b"example")
        descriptions = {
            "folder": "Research <notes> & data",
            "described.pdf": "Summary <em> & details",
            "blank.pdf": "  ",
            "null.pdf": None,
        }
        build_tree(self.root, "Files", descriptions=descriptions, introduction="Read <first>")
        content = (self.root / "index.html").read_text()
        child = (self.root / "folder/index.html").read_text()
        self.assertIn('class="directory-description">Read &lt;first&gt;</p>', content)
        self.assertIn("Summary &lt;em&gt; &amp; details", content)
        self.assertNotIn("Summary <em>", content)
        self.assertEqual(content.count('class="entry-description"'), 2)
        self.assertIn('class="directory-description">Research &lt;notes&gt; &amp; data</p>', child)

    def test_navigation_does_not_repeat_heading_and_identifies_websites(self):
        site = self.root / "project"
        site.mkdir()
        (site / "index.html").write_text("Existing website")
        folder = self.root / "files"
        folder.mkdir()
        arguments = {"website_parent": "Main website", "website_url": "https://ignacioflores.com/"}
        build_tree(self.root, "Development", **arguments)
        content = (self.root / "index.html").read_text()
        navigation = content.split("<nav", 1)[1].split("</nav>", 1)[0]
        self.assertIn('href="https://ignacioflores.com/">Main website</a>', navigation)
        self.assertNotIn("Development", navigation)
        self.assertNotIn("Up one folder", navigation)
        self.assertIn('<h1>Development</h1>', content)
        self.assertEqual(content.count('class="entry-meta">Website</span>'), 1)
        self.assertEqual(content.count('class="entry-meta">Folder</span>'), 1)
        child = (folder / "index.html").read_text()
        child_navigation = child.split("<nav", 1)[1].split("</nav>", 1)[0]
        self.assertIn('<a href="../">Development</a>', child_navigation)
        self.assertIn('class="parent-link" href="../">Up one folder</a>', child_navigation)
        self.assertNotIn(">files<", child_navigation)
        build_tree(self.root, "Development", **arguments)
        self.assertEqual((self.root / "index.html").read_text(), content)

    def test_invalid_description_values_fail_clearly(self):
        path = self.catalog("share:\n  entries:\n    paper.pdf: 123\n")
        with self.assertRaises(ValueError) as raised:
            load_descriptions(path)
        self.assertIn("share", str(raised.exception))
        self.assertIn("paper.pdf", str(raised.exception))
        path.write_text("share:\n  entries:\n    paper.pdf: null\n", encoding="utf-8")
        self.assertIsNone(load_descriptions(path)["share"]["entries"]["paper.pdf"])

    def test_writing_entries_lead_with_bibliography_and_keep_secondary_filename(self):
        name = " research & notes.pdf "
        (self.root / name).write_bytes(b"original PDF")
        details = {
            "title": "A title <with> details",
            "authors": "Alice & Bob",
            "date": "March 2026",
        }
        build_tree(self.root, "PDF files", descriptions={name: details})
        content = (self.root / "index.html").read_text()
        title = '<span class="entry-name entry-title">A title &lt;with&gt; details</span>'
        authors = '<span class="entry-authors">Alice &amp; Bob</span>'
        date = '<span class="entry-date">March 2026</span>'
        filename = '<span class="entry-filename"> research &amp; notes.pdf </span>'
        self.assertLess(content.index(title), content.index(authors))
        self.assertLess(content.index(authors), content.index(date))
        self.assertLess(content.index(date), content.index(filename))
        self.assertNotIn('class="entry-description"', content)
        self.assertIn('href="%20research%20%26%20notes.pdf%20"', content)
        self.assertEqual((self.root / name).read_bytes(), b"original PDF")

    def test_partial_records_use_filename_fallback_and_omit_empty_fields(self):
        path = self.catalog("""main/pdf:
  entries:
    title-only.pdf:
      title: A custom title
    summary-only.pdf:
      description: Summary <with> details
      authors: null
      date: ''
    empty.pdf: {}
    blank-title.pdf:
      title: '  '
      authors: Alice & Bob
""")
        entries = load_descriptions(path)["main/pdf"]["entries"]
        for filename in entries:
            (self.root / filename).write_bytes(b"PDF")
        build_tree(self.root, "PDF files", descriptions=entries)
        content = (self.root / "index.html").read_text()
        self.assertIn('class="entry-name entry-title">A custom title</span>', content)
        self.assertIn('class="entry-filename">title-only.pdf</span>', content)
        self.assertIn('class="entry-name">summary-only.pdf</span>', content)
        self.assertIn('class="entry-description">Summary &lt;with&gt; details</span>', content)
        self.assertIn('class="entry-name">empty.pdf</span>', content)
        self.assertIn('class="entry-name">blank-title.pdf</span>', content)
        self.assertIn('class="entry-authors">Alice &amp; Bob</span>', content)
        self.assertEqual(content.count('class="entry-filename"'), 1)
        self.assertEqual(content.count('class="entry-authors"'), 1)
        self.assertNotIn('class="entry-date"', content)

    def test_yaml_date_scalars_are_normalized_and_displayed(self):
        path = self.catalog("""main/pdf:
  entries:
    year.pdf:
      date: 2026
    day.pdf:
      date: 2026-03-19
    prose.pdf:
      date: March 2026
""")
        entries = load_descriptions(path)["main/pdf"]["entries"]
        for filename, expected in (
            ("year.pdf", "2026"), ("day.pdf", "2026-03-19"), ("prose.pdf", "March 2026")
        ):
            self.assertEqual(entries[filename]["date"], expected)
            (self.root / filename).write_bytes(b"PDF")
        build_tree(self.root, "PDF files", descriptions=entries)
        content = (self.root / "index.html").read_text()
        for expected in ("2026", "2026-03-19", "March 2026"):
            self.assertIn('class="entry-date">{}</span>'.format(expected), content)

    def test_yaml_edits_refresh_file_descriptions_and_folder_introductions(self):
        (self.root / "folder").mkdir()
        (self.root / "paper.pdf").write_bytes(b"PDF")
        path = self.catalog("""share:
  intro: Original introduction
  entries:
    folder: Original folder description
    paper.pdf: Original paper description
""")

        def rebuild():
            settings = load_descriptions(path)["share"]
            build_tree(self.root, "Shared files", descriptions=settings["entries"], introduction=settings["intro"])

        rebuild()
        self.assertIn("Original paper description", (self.root / "index.html").read_text())
        self.assertIn("Original folder description", (self.root / "folder/index.html").read_text())
        path.write_text("""share:
  intro: Updated introduction
  entries:
    folder:
      title: Ignored folder title
      description: Updated folder <description>
    paper.pdf:
      title: Updated title
      description: Updated paper description
""", encoding="utf-8")
        rebuild()
        content = (self.root / "index.html").read_text()
        child = (self.root / "folder/index.html").read_text()
        self.assertIn('class="directory-description">Updated introduction</p>', content)
        self.assertIn('class="entry-name">folder/</span>', content)
        self.assertIn("Updated folder &lt;description&gt;", content)
        self.assertIn('class="directory-description">Updated folder &lt;description&gt;</p>', child)
        self.assertIn("Updated title", content)
        self.assertIn("Updated paper description", content)
        self.assertNotIn("Ignored folder title", content)
        self.assertNotIn("Original", content + child)

    def test_missing_and_empty_catalogs_are_optional(self):
        path = Path(self.temporary.name) / "missing.yml"
        self.assertEqual(load_descriptions(path), {})
        self.assertEqual(load_descriptions(self.catalog("# No descriptions yet\n")), {})

    def test_invalid_yaml_and_unsafe_tags_fail_with_catalog_path(self):
        for text in ("share: [\n", "!!python/object/apply:builtins.str [unsafe]\n"):
            with self.subTest(text=text):
                path = self.catalog(text)
                with self.assertRaisesRegex(ValueError, "[Ii]nvalid YAML") as raised:
                    load_descriptions(path)
                self.assertIn(str(path), str(raised.exception))

    def test_invalid_catalog_shapes_and_record_fields_fail_clearly(self):
        for text, context in (
            ("- share\n", None),
            ("share: []\n", "share"),
            ("share:\n  intro: 123\n", "share"),
            ("share:\n  entries: []\n", "share"),
        ):
            with self.subTest(text=text):
                with self.assertRaises(ValueError) as raised:
                    load_descriptions(self.catalog(text))
                if context:
                    self.assertIn(context, str(raised.exception))
        for field, value in (
            ("title", "[]"), ("authors", "false"), ("description", "123"),
            ("date", "false"), ("date", "2026.5"), ("date", "[]"),
        ):
            with self.subTest(field=field, value=value):
                path = self.catalog("share:\n  entries:\n    paper.pdf:\n      {}: {}\n".format(field, value))
                with self.assertRaises(ValueError) as raised:
                    load_descriptions(path)
                for context in ("share", "paper.pdf", field):
                    self.assertIn(context, str(raised.exception))


if __name__ == "__main__":
    unittest.main()
