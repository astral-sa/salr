set PATH=%PATH%;C:\Program Files\7-Zip

7z a -tzip salastread.xpi * -r -mx=9 -xr!.svn -x!*.bat -x!*.sh -x!*.xpi -x!Thumbs.db -x!desktop.ini -x!*-jar -x!*-nojar