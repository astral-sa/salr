/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Linky installer
 *
 * The Initial Developer of the Original Code is Henrik Gemal.
 * Portions created by the Initial Developer are Copyright (C) 2002-2003
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Henrik Gemal <linky@gemal.dk> http://gemal.dk
 *   Matthew Wilson <matthew@mjwilson.demon.co.uk>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const myProductName = "SomethingAwful Last Read Enhancement";
const myProductRegKey = "salastread";
const myProductRegVersion = "1.15.1918";
const myProductRegVersionBuild = "1";
const myJarFileName = "salastread.jar";
const myJarFileSize = 37; // the filesize in KB of myJarFileName
const myComponentFileName = "SALastReadCom.js";
const myComponentFileSize = 15;
const myLocales = new Array("en-US"); // the locales available
const myJarCheckDupe = 1; // check if myJarFileName exist both in personal chrome folder and global chrome folder

// global settings
// dont change these
const sysChromeGlobal = getFolder("Chrome");
const sysChromeGlobalJar = getFolder("Chrome", myJarFileName);
const sysChromeUser = getFolder("Current User","chrome");
const sysChromeUserJar = getFolder("Current User", "chrome/" + myJarFileName);
const sysComponents = getFolder("Components");
const errPage = "http://devedge.netscape.com/library/manuals/2001/xpinstall/1.0/err.html";

// verify disk space in kilobytes
function verifyDiskSpace(dirPath, spaceRequired) {
    var spaceAvailable = fileGetDiskSpaceAvailable(dirPath);
    if (parseInt(spaceAvailable/1024) < spaceRequired) {
        logComment("Insufficient disk space: " + dirPath + "\n\trequired : " + spaceRequired + " K\n\tavailable: " + spaceAvailable + " K");
        return(false);
    } else {
        return(true);
    }
}

const GLOBAL    = 1;
const PERSONAL  = 2;
// inst is the installation method:
//		1 is in the global chrome folder. This *has* to be the default!
//		2 in in the personal profile folder. This is only supported for newer builds.
// Note that we do NOT offer installation into the personal profile folder by default.
// Since we have to write into the global components directory, we may as well write into the
// global chrome too.
// However some users may be upgrading from an earlier release when they did install into the
// personal profile folder. For these users only, install the chrome into the user profile.

var inst = GLOBAL; // by default

// Check if extension already is installed in the personal profile area
if (File.exists(sysChromeUserJar)) {
    // Automatically install into the user area without asking
    inst = PERSONAL;
}

// did the user cancel?
var err;
var err_tmp;

// have we already given an error pop-up to the user?
var alerted = false;

// init the installation
err_tmp = initInstall(myProductName, myProductRegKey, myProductRegVersion + "." + myProductRegVersionBuild);
if (err_tmp) {
    err = err_tmp;
}

logComment(myProductName + " version " + myProductRegVersion + " being installed on " + buildID);
logComment("Installation method is " + inst);

// check if there's disk space for myJarFileSize
if (!err && !verifyDiskSpace((inst == GLOBAL ? sysChromeGlobal : sysChromeUser), myJarFileSize)) {
    err = INSUFFICIENT_DISK_SPACE;
}

if (!err && !verifyDiskSpace(sysComponents, myComponentFileSize)) {
    err = INSUFFICIENT_DISK_SPACE;
}

// add the jar file
if (!err) {
    if (inst == PERSONAL) {
        err_tmp = addFile(myProductName, "chrome/" + myJarFileName, sysChromeUser, "");
    } else {
        err_tmp = addFile(myProductName, "chrome/" + myJarFileName, sysChromeGlobal, "");
    }
    if (err_tmp) {
        logComment("Problem adding jar file. Error code: " + err_tmp);
        alert ("There was a problem installing " + myProductName + ".\n(Maybe you don't have the correct permissions.)");
        alerted = true;
        err = err_tmp;
    } else {
        logComment("OK adding jar file.");
    }
}

// add the component
if (!err) {
    err_tmp = addFile(myProductName, "components/" + myComponentFileName, sysComponents, "");
    if (err_tmp) {
        logComment("Problem adding component. Error code: " + err_tmp);
        if (!alerted) { // Don't annoy the user a second time
            alert ("There was a problem installing " + myProductName + ".\n(Maybe you don't have the correct permissions.)");
        }
        alerted = true;
        err = err_tmp;
    } else {
        logComment("OK adding component.");
    }
}

// register the content
if (!err) {
    if (inst == PERSONAL) {
        err_tmp = registerChrome(PACKAGE | PROFILE_CHROME, sysChromeUserJar, "content/" + myProductRegKey + "/");
    } else {
        err_tmp = registerChrome(PACKAGE | DELAYED_CHROME, sysChromeGlobalJar, "content/" + myProductRegKey + "/");
    }
    if (err_tmp) {
        logComment("Problem registering the content chrome. Error code: " + err_tmp);
        err = err_tmp;
    } else {
        logComment("OK registering the content chrome.");
    }
}

// register the locale
if (!err) {
    if (inst == PERSONAL) {
        for (var i = 0; i < myLocales.length; i++) {
            err_tmp = registerChrome(LOCALE | PROFILE_CHROME, sysChromeUserJar, "locale/" + myLocales[i] + "/" + myProductRegKey + "/");
            if (err_tmp)
                break;
        }
    } else {
        for (var i = 0; i < myLocales.length; i++) {
            err_tmp = registerChrome(LOCALE | DELAYED_CHROME, sysChromeGlobalJar, "locale/" + myLocales[i] + "/" + myProductRegKey + "/");
            if (err_tmp) {
                break;
            }
        }
    }
    if (err_tmp) {
        logComment("Problem registering the locale chrome. Error code: " + err_tmp);
        err = err_tmp;
    } else {
        logComment("OK registering the locale chrome.");
    }
}

// do the install
if (!err) {
    err_tmp = performInstall();
    if (err_tmp < 0) {
        logComment("Problem performing install. Error code: " + err_tmp);
        err = err_tmp;
    } else {
        alert(myProductName + " version " + myProductRegVersion + " has been successfully installed!\nYou must restart your browser to complete installation.");
    }
}

// did it work?
if (err) {
    logComment("Problem installing. Error code: " + err + ". Error codes can been seen at: " + errPage);
    alert(myProductName + " version " + myProductRegVersion + " was not installed!\nError code: " + err + "\n\nError codes can been seen at:\n" + errPage);
    cancelInstall(err);
}
