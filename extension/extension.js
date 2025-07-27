import St from 'gi://St'
import GObject from 'gi://GObject'
import AccountsService from 'gi://AccountsService'
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js'
import {LoginDialog} from 'resource:///org/gnome/shell/gdm/loginDialog.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'

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
        // TODO: figure out a way of avoiding the blinking draw-userlist-then-hide-userlist that happens
        userlistitems[0].emit("activate")
        tries_left -= 1 // TODO: Disable when LoginDialog/AuthPrompt/... emits a 'reset' instead of this
      }
      const result = wrapped_method.call(this)
      try_activate_single_userlistitem()
      return result
    }
  }

  constructor(metadata) {
    super(metadata)
    this._original_loadUserList = LoginDialog.prototype._loadUserList
  }

  enable() {
    tries_left = 1
    LoginDialog.prototype._loadUserList = this._wrapper_loadUserList(this._original_loadUserList)
  }

  disable() {
    LoginDialog.prototype._loadUserList = this._original_loadUserList
  }
}
