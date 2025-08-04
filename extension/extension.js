
import {Extension, InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js'
import {LoginDialog} from 'resource:///org/gnome/shell/gdm/loginDialog.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import St from 'gi://St'

let tries_left = -1

export default class AutoselectUserExtension extends Extension {
  injection_manager = null

  constructor(metadata) {
    super(metadata)
  }

  enable() {
    tries_left = 1
    this.injection_manager = new InjectionManager();

    this.injection_manager.overrideMethod(
      LoginDialog.prototype,
      "_loadUserList",
      _loadUserList => function() {
        const result = _loadUserList.call(this)
        try {
          if (tries_left <= 0) return;

          const userlistitems = accumulate_userlistitems(Main.uiGroup)
          if (userlistitems.length != 1) return;
          // TODO: allow specifying an index or a username to autoselect? (Instead of only applying to n=1)
          userlistitems[0].emit("activate")
          tries_left -= 1 // TODO: Disable when LoginDialog/AuthPrompt/... emits a 'reset' instead of this
        } finally {
          return result
        }
      }
    )

    this.injection_manager.overrideMethod(
      LoginDialog.prototype,
      "_onUserListActivated",
      _onUserListActivated => function(...args) {
        // The existing LoginDialog#_onUserListActivated has no way of disabling
        // the animation caused by GdmUtil.cloneAndFadeOutActor. Hence, to disable
        // the ease() call on the cloned actor, we pass a dummy `_userSelectionBox`
        // object and manually hide the user list.
        this._userSelectionBox.hide()
        const _userSelectionBox = this._userSelectionBox
        this._userSelectionBox = new St.BoxLayout()  // TODO: allocate once at enable-time, and then also destroy in disable()
        try {
          _onUserListActivated.call(this, ...args)
        } finally {
          this._userSelectionBox = _userSelectionBox
        }
      }
    )
  }

  disable() {
    this.injection_manager.clear()
    this.injection_manager = null
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
