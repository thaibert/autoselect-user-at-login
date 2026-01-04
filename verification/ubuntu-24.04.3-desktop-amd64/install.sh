#!/usr/bin/env bash
set -o errexit
set -o nounset

extension_uuid="autoselect-user-at-login@thaibert.com"
script_dir="$(dirname "$(realpath "${BASH_SOURCE}")")"

sudo apt install -y systemd-container # provides `machinectl`

echo "Installing '${extension_uuid}' extension"
sudo cp -rvf "${script_dir}/${extension_uuid}" /usr/share/gnome-shell/extensions

echo "Enabling '${extension_uuid} extension'"
sudo machinectl shell gdm@ /usr/bin/gnome-extensions enable "${extension_uuid}"
