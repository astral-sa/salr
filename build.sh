#!/bin/bash
rm salastread.xpi
7z a -tzip salastread.xpi * -r -mx=9 -xr\!.git -x\!.gitignore -x\!\*.bat -x\!\*.sh -x\!\*.xpi -x\!salr.rdf
