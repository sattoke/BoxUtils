# [Prerequisite]
# - Pandoc must be installed.

SED = sed
PANDOC = pandoc
PANDOC_OPTIONS = --standalone --self-contained --number-sections --toc --from markdown+pandoc_title_block+autolink_bare_uris+footnotes-ascii_identifiers+header_attributes+definition_lists+multiline_tables-hard_line_breaks --to html5 --metadata=title:BoxUtils

VERSION_FILE = VERSION
MANIFEST_SRC = manifest.json.tmpl
MANIFEST_DST = manifest.json

README_MD = README.md
README_CSS = README.css
README_SRCS = $(README_MD) $(README_CSS)
README_DST = README.html

FILES_TO_FORMAT = $(README_SRCS) src

.PHONE: all
all: $(MANIFEST_DST) $(README_DST) format

$(README_DST): $(README_SRCS)
	$(PANDOC) $(PANDOC_OPTIONS) --css $(README_CSS) --output $@ $(README_MD)

$(MANIFEST_DST): $(MANIFEST_SRC) $(VERSION_FILE)
	$(SED)  s/__VERSION__/$$(cat $(VERSION_FILE))/g < $(MANIFEST_SRC) > $(MANIFEST_DST)

.PHONE: format
format:
	npx prettier --write $(FILES_TO_FORMAT)
