## Auto-select User at Login (a GNOME Shell Extension)

This GNOME Shell extension saves you a click at login-time by auto-selecting the only user from the list of users.
The extension is meant to work for systems where only a single user is displayed at the login dialog.

### Installation
This extension relies on the `"gdm"` session mode, so it _must_ be installed as a system-wide extension and enabled for the `gdm` user.

#### Steps
1. Un-tar into `/usr/share/gnome-shell/extensions/`
   ```sh
   sudo cp autoselect-user-at-login@thaibert.com.tgz /usr/share/gnome-shell/extensions
   cd /usr/share/gnome-shell/extensions
   sudo tar xzvf autoselect-user-at-login@thaibert.com.tgz
   ```
2. Enable the extension for the `gdm` user
   ```sh
   sudo machinectl shell gdm@ /usr/bin/gnome-extensions enable autoselect-user-at-login@thaibert.com
   ```

