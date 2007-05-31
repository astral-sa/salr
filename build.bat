set PATH=%PATH%;C:\Program Files\7-Zip

set x=salastread
md build\chrome
md build\components
md build\defaults
md build\skin
cd chrome
7z a -tzip "%x%.jar" * -r -mx=0 -xr!.svn -x!Thumbs.db -x!desktop.ini
move "%x%.jar" ..\build\chrome
cd ..
copy install.* build
copy chrome.manifest-jar build\chrome.manifest
copy components build\components
xcopy /E defaults build\defaults
xcopy /E skin build\skin
cd build
7z a -tzip "%x%.xpi" * -r -mx=9 
move "%x%.xpi" ..\
cd ..
rd build /s/q