uuid := $(shell jq -r ".uuid" extension/metadata.json)
dist := .dist
working-dir := .working-dir

.DEFAULT_GOAL := help

.PHONY: extension
extension: ${dist}/${uuid}.tgz

#### Utilities ####
${dist}:
	mkdir -p ${dist}/
	echo "*" > ${dist}/.gitignore

.PHONY: clean
clean:
	rm -rf ${dist}/

${working-dir}:
	mkdir -p ${working-dir}/
	echo "*" > ${working-dir}/.gitignore

.PHONY: clean-disks
clean-disks:
	rm -rf ${working-dir}/

#### The extension itself ####
.PHONY: install
install: ${dist}/${uuid} | ${dist}
	sudo mkdir -pv /usr/share/gnome-shell/extensions
	sudo cp -rvf ${dist}/${uuid} /usr/share/gnome-shell/extensions
	sudo machinectl shell gdm@ /usr/bin/gnome-extensions enable ${uuid}

${dist}/${uuid}.tgz: ${dist}/${uuid} | ${dist}
	tar czvf $@ -C ${dist}/ ${uuid}

${dist}/${uuid}: $(wildcard extension/*) | ${dist}
	mkdir -p $@
	touch $@
	cp $(wildcard extension/*) $@

#### Testing with ubuntu-24.04.3 ####
ubuntus :=
ubuntus += ubuntu-24.04.3-desktop-amd64
ubuntus += ubuntu-25.04-desktop-amd64

ubuntu-install = $(addsuffix -install,$(ubuntus))
.PHONY: $(ubuntu-install)
$(ubuntu-install): %-install: ${dist}/autoinstall-%.iso ${working-dir}/%.qcow2 verification/%.iso | ${dist}
	qemu-system-x86_64 \
			-enable-kvm \
			-cpu host \
			-m 4096 \
			-vga virtio \
			-boot d \
			-drive media=disk,format=qcow2,file=${working-dir}/$*.qcow2 \
			-drive media=cdrom,file=verification/$*.iso \
			-drive if=virtio,media=disk,format=raw,file=${dist}/autoinstall-$*.iso

ubuntu-run = $(addsuffix -run,$(ubuntus))
.PHONY: $(ubuntu-run)
$(ubuntu-run): %-run: ${working-dir}/%.qcow2 ${dist}/payload-%.iso | ${dist}
	qemu-system-x86_64 \
			-enable-kvm \
			-cpu host \
			-m 4096 \
			-vga virtio \
			-display gtk,show-menubar=off \
			-drive file=${working-dir}/$*.qcow2,format=qcow2,media=disk \
			-drive file=${dist}/payload-$*.iso,format=raw,media=cdrom

ubuntu-clean = $(addsuffix -clean,$(ubuntus))
.PHONY: $(ubuntu-clean)
$(ubuntu-clean): %-clean:
	rm -fv ${working-dir}/$*.qcow2

ubuntu-disks = $(patsubst %, ${working-dir}/%.qcow2, $(ubuntus))
$(ubuntu-disks): | ${working-dir}
	qemu-img create -f qcow2 $@ 15G

ubuntu-autoinstall = $(patsubst %, ${dist}/autoinstall-%.iso, $(ubuntus))
.SECONDEXPANSION:
$(ubuntu-autoinstall): ${dist}/autoinstall-%.iso: $$(wildcard verification/%/cidata/*) | ${dist}
	genisoimage -output $@ -volid CIDATA -rational-rock -joliet verification/$*/cidata

ubuntu-payload-iso = $(patsubst %, ${dist}/payload-%.iso, $(ubuntus))
$(ubuntu-payload-iso): ${dist}/payload-%.iso: ${dist}/payload/% | ${dist}
	genisoimage -output $@ -volid gnome-extension -rational-rock -joliet ${dist}/payload/$*

ubuntu-payload = $(patsubst %, ${dist}/payload/%, $(ubuntus))
$(ubuntu-payload): ${dist}/payload/%: ${dist}/${uuid} verification/%/install.sh | ${dist}
	mkdir -p $@
	touch $@
	cp -rv ${dist}/${uuid} $@
	cp -v verification/$*/install.sh $@

####  ####

.PHONY: help
help:
	# https://stackoverflow.com/a/26339924/19233860
	@echo Possible targets:
	@LC_ALL=C $(MAKE) -pRrq -f $(firstword $(MAKEFILE_LIST)) : 2>/dev/null | awk -v RS= -F: '/(^|\n)# Files(\n|$$)/,/(^|\n)# Finished Make data base/ {if ($$1 !~ "^[#.]") {print $$1}}' | sort | grep -E -v -e '^[^[:alnum:]]' -e '^$@$$' | xargs printf "\t%s\n"
