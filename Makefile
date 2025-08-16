uuid := $(shell jq -r ".uuid" extension/metadata.json)

dist/${uuid}.tgz: dist/${uuid}
	tar czvf dist/${uuid}.tgz -C dist/ ${uuid}

dist/${uuid}: $(wildcard extension/*)
	mkdir -p dist/${uuid}
	cp $(wildcard extension/*) dist/${uuid}

.PHONY: clean
clean:
	rm -rf dist/

$(wildcard *): dist/.gitignore
dist/.gitignore:
	mkdir -p dist/
	echo "*" > dist/.gitignore
