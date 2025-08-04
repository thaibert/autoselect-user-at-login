
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js'
import {LoginDialog} from 'resource:///org/gnome/shell/gdm/loginDialog.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import St from 'gi://St'

let tries_left = -1
export default class AutoselectUserExtension extends Extension {
  _original_loadUserList = () =>
    console.trace("Unreachable: this should have been set by `enable()`")
  _wrapper_loadUserList = function(wrapped_method) {
    return function() {
      const try_activate_single_userlistitem = () => {
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

        if (tries_left <= 0) return;

        const userlistitems = accumulate_userlistitems(Main.uiGroup)
        if (userlistitems.length != 1) return;
        // TODO: allow specifying an index or a username to autoselect? (Instead of only applying to n=1)
        userlistitems[0].emit("activate")
        tries_left -= 1 // TODO: Disable when LoginDialog/AuthPrompt/... emits a 'reset' instead of this
      }

      const result = wrapped_method.call(this)
      try_activate_single_userlistitem()

      return result
    }
  }

  _original_onUserListActivated = () =>
    console.trace("Unreachable: this should have been set by `enable()`")
  _wrapper_onUserListActivated = function(wrapped_method) {
    return function(activatedItem) {
      // The existing LoginDialog#_onUserListActivated has no way of disabling
      // the animation caused by GdmUtil.cloneAndFadeOutActor. Hence, to disable
      // the ease() call on the cloned actor, we pass a dummy `_userSelectionBox`
      // object and manually hide the user list.
      this._userSelectionBox.hide()
      const _userSelectionBox = this._userSelectionBox
      this._userSelectionBox = new St.BoxLayout()  // TODO: allocate once at enable-time, and then also destroy in disable()
      try {
        wrapped_method.call(this, activatedItem)
      } finally {
        this._userSelectionBox = _userSelectionBox
      }
    }
  }

  constructor(metadata) {
    super(metadata)
    this._original_loadUserList = LoginDialog.prototype._loadUserList
    this._original_onUserListActivated = LoginDialog.prototype._onUserListActivated
  }

  enable() {
    tries_left = 1
    LoginDialog.prototype._loadUserList = this._wrapper_loadUserList(this._original_loadUserList)
    LoginDialog.prototype._onUserListActivated = this._wrapper_onUserListActivated(this._original_onUserListActivated)
  }

  disable() {
    LoginDialog.prototype._loadUserList = this._original_loadUserList
    LoginDialog.prototype._onUserListActivated = this._original_onUserListActivated
  }
}
