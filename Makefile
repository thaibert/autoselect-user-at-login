uuid := $(shell jq -r ".uuid" extension/metadata.json)

.PHONY: all
all: dist/${uuid}.tgz dist/${uuid}.ubuntu-24.04.3.iso

#### Utilities ####
dist:
	mkdir -p dist/
	echo "*" > dist/.gitignore

.PHONY: clean
clean:
	rm -rf dist/


#### The extension itself ####
dist/${uuid}.tgz: dist/${uuid} | dist
	tar czvf $@ -C dist/ ${uuid}

dist/${uuid}: $(wildcard extension/*) | dist
	mkdir -p $@
	touch $@
	cp $(wildcard extension/*) $@


#### Testing with ubuntu-24.04.3 ####
.PHONY: ubuntu-24.04.3-install
ubuntu-24.04.3-install: dist/ubuntu-24.04.3-autoinstall.iso verification/ubuntu-24.04.3/disk.qcow2 verification/ubuntu-24.04.3/ubuntu-24.04.3-desktop-amd64.iso
	qemu-system-x86_64 \
			-enable-kvm \
			-cpu host \
			-m 4096 \
			-vga virtio \
			-boot d \
			-drive media=disk,format=qcow2,file=verification/ubuntu-24.04.3/disk.qcow2 \
			-drive media=cdrom,file=verification/ubuntu-24.04.3/ubuntu-24.04.3-desktop-amd64.iso \
			-drive if=virtio,media=disk,format=raw,file=dist/ubuntu-24.04.3-autoinstall.iso

.PHONY: ubuntu-24.04.3-run
ubuntu-24.04.3-run: verification/ubuntu-24.04.3/disk.qcow2 dist/${uuid}.ubuntu-24.04.3.iso
	qemu-system-x86_64 \
			-enable-kvm \
			-cpu host \
			-m 4096 \
			-vga virtio \
			-display gtk,show-menubar=off \
			-drive file=verification/ubuntu-24.04.3/disk.qcow2,format=qcow2,media=disk \
			-drive file=dist/${uuid}.ubuntu-24.04.3.iso,format=raw,media=cdrom

.PHONY: ubuntu-24.04.3-clean
ubuntu-24.04.3-clean: clean
ifneq ("$(wildcard verification/ubuntu-24.04.3/*.qcow2)","")
	rm -f $(wildcard verification/ubuntu-24.04.3/*.qcow2)
endif

verification/ubuntu-24.04.3/disk.qcow2:
	printf ".gitignore\n*.qcow2" > verification/ubuntu-24.04.3/.gitignore
	qemu-img create -f qcow2 $@ 15G

dist/ubuntu-24.04.3-autoinstall.iso: $(wildcard verification/ubuntu-24.04.3/cidata/*) | dist
	genisoimage -output $@ -volid CIDATA -rational-rock -joliet verification/ubuntu-24.04.3/cidata

dist/${uuid}.ubuntu-24.04.3.iso: dist/iso-dist/ubuntu-24.04.3 | dist
	genisoimage -output $@ -volid gnome-extension -rational-rock -joliet dist/iso-dist/ubuntu-24.04.3

dist/iso-dist/ubuntu-24.04.3: dist/${uuid} verification/ubuntu-24.04.3/install.sh | dist
	mkdir -p $@
	touch $@
	cp -r dist/${uuid} $@
	cp verification/ubuntu-24.04.3/install.sh $@


####  ####
