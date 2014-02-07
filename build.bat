
set PATH=%PATH%;C:\Program Files\7-Zip

del salastread.xpi
7z a -tzip salastread.xpi * -r -mx=9 -xr!.git -x!.gitignore -x!*.bat -x!*.sh -x!*.xpi -x!Thumbs.db -x!desktop.ini -x!salr.rdf
