import {Extension, InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js'
import {LoginDialog} from 'resource:///org/gnome/shell/gdm/loginDialog.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import St from 'gi://St'
import GObject from 'gi://GObject'

export default class AutoselectUserExtension extends Extension {
  injection_manager = null
  dummy_boxlayout = null
  lifetime_startup_complete = null
  lifetime_cancelled = null

  constructor(metadata) {
    super(metadata)
  }

  enable() {
    this.injection_manager = new InjectionManager()
    this.dummy_boxlayout = new St.BoxLayout()
    this.lifetime_startup_complete = new St.Label()
    this.lifetime_cancelled = new St.Label()

    Main.layoutManager.connectObject(
      "startup-complete",
      () => {
        const loginDialog = Main.screenShield._dialog
        const expected_type = LoginDialog
        if (! loginDialog instanceof expected_type) {
          console.trace(`ERROR: expected screenShield._dialog to be a ${expected_type.prototype.constructor.name} after "startup-complete", but got object with constructor '${loginDialog?.constructor?.name}'`)
          return
        }

        loginDialog._authPrompt.connectObject(
          "cancelled",
          () => {
            this.lifetime_cancelled?.destroy()
            this.lifetime_cancelled = null
            this.disable()
          },
          this.lifetime_cancelled
        )

        this.lifetime_startup_complete?.destroy
        this.lifetime_startup_complete = null
      },
      // NB: https://gjs-docs.gnome.org/gjs/overrides.md#gobject-object-connect_object  lies!
      //     The gobject must come last, not second-to-last (see impl):
      //     * https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/2d5d3056e9dad839b137477c937d0dc05f3b3d16/js/ui/environment.js#L261
      //     * https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/2d5d3056e9dad839b137477c937d0dc05f3b3d16/js/misc/signalTracker.js#L209
      GObject.ConnectFlags.AFTER,
      this.lifetime_startup_complete
    )

    this.injection_manager.overrideMethod(
      LoginDialog.prototype,
      "_loadUserList",
      _loadUserList => function(...args) {
        const result = _loadUserList.call(this, ...args)
        try {
          const userlistitems = accumulate_userlistitems(Main.screenShield._lockDialogGroup)
          if (userlistitems.length != 1) return;
          // TODO: allow specifying an index or a username to autoselect? (Instead of only applying to n=1)
          userlistitems[0].emit("activate")
        } finally {
          return result
        }
      }
    )

    this.injection_manager.overrideMethod(
      LoginDialog.prototype,
      "_onUserListActivated",
      _onUserListActivated => {
        const dummy_boxlayout = this.dummy_boxlayout
        return function(...args) {
          // The existing LoginDialog#_onUserListActivated has no way of disabling
          // the animation caused by GdmUtil.cloneAndFadeOutActor. Hence, to disable
          // the ease() call on the cloned actor, we pass a dummy `_userSelectionBox`
          // object and manually hide the user list.
          this._userSelectionBox.hide()
          const _userSelectionBox = this._userSelectionBox
          this._userSelectionBox = dummy_boxlayout
          try {
            _onUserListActivated.call(this, ...args)
          } finally {
            this._userSelectionBox = _userSelectionBox
          }
        }
      }
    )
  }

  disable() {
    this.injection_manager?.clear()
    this.injection_manager = null
    this.dummy_boxlayout?.destroy()
    this.dummy_boxlayout = null
    this.lifetime_cancelled?.destroy()
    this.lifetime_cancelled = null
    this.lifetime_startup_complete?.destroy()
    this.lifetime_startup_complete = null
  }
}

const accumulate_userlistitems = (start) => {
  const stack = [start]
  const result = []
  while (stack.length > 0) {
    const curr = stack.pop()
    if (curr?.get_children && curr.get_children().length > 0) {
      stack.push(...(curr.get_children()))
    }
    switch (curr?.constructor?.name) {
      case "UserListItem": result.push(curr)
    }
  }
  return result
}
