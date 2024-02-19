/*
   This software is licensed under the MIT License. See the license file for details.
   Source: https://github.com/spacehuhntech/WiFiDuck
 */


// ========== Global Variables ========== //

// ! List of files returned by "ls" command
var file_list = "";

// ! Variable to save interval for updating status continously
var status_interval = undefined;

// ! Unsaved content in the editor
var unsaved_changed = false;

// ! Flag if editor has loaded a file yet
var file_opened = false;

// ========== Global Functions ========== //

// ===== Value Getters ===== //
//function get_new_filename() {
//  return E("newFile").value;
//}
//
//function get_editor_filename() {
//  return E("editorFile").value;
//}
//
//function set_editor_filename(filename) {
//  return E("editorFile").value = filename;
//}

function get_keyboard_content() {
  var content = E("keyboard").value;

  if (!content.endsWith("\n"))
    content = content + "\n";

  return content;
}

// ! Update status until it's no longer "running"
function check_status() {
  if (current_status.includes("running") || current_status.includes("saving"))
    ws_update_status();
  else
    stop_status_interval();
}

// ! Start interval that checks and updates the status continously
function start_status_interval() {
  if (status_interval) return; // !< Only continue if status_interval not set

  ws_update_status(); // !< Get current status
  status_interval = setInterval(check_status, 500); // !< Start interval
}

// ! Stop interval that checks and updates the status continously
function stop_status_interval() {
  if (!status_interval) return; // !< Only continue if status_interval was set

  // ! Stop interval and unset variable
  clearInterval(status_interval);
  status_interval = undefined;
}

// ! Append string to script content
function append(str) {
  E("editor").value += str;
}

// ! Updates file list and memory usage
function update_file_list() {
  ws_send("mem", function(msg) {
    var lines = msg.split(/\n/);
    
    if(lines.length == 1) {
      console.error("Malformed response:");
      console.error(msg);
      return;
    }

    var byte = lines[0].split(" ")[0];
    var used = lines[1].split(" ")[0];
    var free = lines[2].split(" ")[0];

    var percent = Math.floor(byte / 100);
    var freepercent = Math.floor(free / percent);

    E("freeMemory").innerHTML = used + " byte used (" + freepercent + "% free)";
  });
}

// ! Format SPIFFS
function format() {
  if (confirm("Format SPIFFS? This will delete all scripts!")) {
    ws_send("format", log_ws);
    alert("Formatting will take a minute.\nYou have to reconnect afterwards.");
  }
}

function sendSpotlight() {
  ws_send("press GUI SPACE");
}

function sendNew() {
  ws_send("press GUI n");
}

function sendNewTab() {
  ws_send("press GUI t");
}

function sendSwitchApp() {
  ws_send("press GUI TAB");
}

function sendSwitchWindow() {
  ws_send("press GUI `");
}

function sendLockMac() {
  ws_send("press CTRL GUI q");
}

function sendLockWin() {
  ws_send("press GUI l");
}

function sendCloseWindow() {
  ws_send("press GUI w");
}

function sendQuitProgram() {
  ws_send("press GUI q");
}

function sendCtrlAltDel() {
  ws_send("press CTRL ALT DELETE");
}


// ! handleInput script
function handleInput(e) {
  const valid_modifiers = ["Alt", "Control", "Meta", "Shift"];
  const other_keys = {
    "Enter": "ENTER",
    "Menu": "MENU",
    "App": "APP",
    "Delete": "DELETE",
    "Backspace": "BACKSPACE",
    "Home": "HOME",
    "Insert": "INSERT",
    "PageUp": "PAGEUP",
    "PageDown": "PAGEDOWN",
    "ArrowUp": "UP",
    "ArrowDown": "DOWN",
    "ArrowRight": "RIGHT",
    "ArrowLeft": "LEFT",
    "Tab": "TAB",
    "End": "END",
    "Escape": "ESC",
    "Space": "SPACE",
    "Spacebar": "SPACE",
    "Pause": "PAUSE",
    "Break": "BREAK",
    "CapsLock": "CAPSLOCK",
    "NumLock": "NUMLOCK",
    "PrintScreen": "PRINTSCREEN",
    "ScrollLock": "SCROLLLOCK"
  }
  var input_key = valid_modifiers.includes(e.key) ? "" : (e.key == " " || e.code == "Space" || e.keyCode == 32) ? "SPACE" : e.key;
  var re = new RegExp( Object.keys(other_keys).join("|"), "g");
  input_key = input_key.replace(re, function(m) { return other_keys[m] }); 
  var modifiers = ""
  modifiers += e.altKey ? "ALT " : "";
  modifiers += e.ctrlKey ? "CTRL " : "";
  modifiers += e.metaKey ? "GUI " : "";
  modifiers += e.shiftKey ? "SHIFT " : "";
  console.log("input received keypress: " + modifiers + input_key);
  E("editorinfo").innerHTML = "pressing " + modifiers + input_key;
  ws_send("press \"" + modifiers + input_key + "\"", log_ws);
  e.preventDefault();
}

// ! Run script
function run(fileName) {
  ws_send("run \"" + fixFileName(fileName) + "\"", log_ws);
  start_status_interval();
}

// ! Stop running specific script
function stop(fileName) {
  ws_send("stop \"" + fixFileName(fileName) + "\"", log_ws, true);
}

// ! Stop running all scripts
function stopAll() {
  ws_send("stop", log_ws, true);
}

// ! Function that is called once the websocket connection was established
function ws_connected() {
  update_file_list();
}

// ========== Startup ========== //
window.addEventListener("load", function() {
  E("reconnect").onclick = ws_init;
  E("format").onclick = format;
  E("stop").onclick = stopAll;

  E("spotlight").onclick = sendSpotlight;
  E("new").onclick = sendNew;
  E("new_tab").onclick = sendNewTab;
  E("switch_app").onclick = sendSwitchApp;
  E("switch_window").onclick = sendSwitchWindow;
  E("lock_mac").onclick = sendLockMac;
  E("lock_win").onclick = sendLockWin;
  E("close").onclick = sendCloseWindow;
  E("quit").onclick = sendQuitProgram;
  E("ctrl_alt_del").onclick = sendCtrlAltDel;

  E("keyboard").addEventListener("keydown", handleInput);

  // ! Make all <code>s append to the editor when clicked
  var codes = document.querySelectorAll("code");
  for (var i = 0; i < codes.length; i++) {
    codes[i].addEventListener("click", function() {
      append(this.innerHTML + " \n");
    });
  }

  ws_init();
}, false);
