#!/bin/bash
7z a -tzip salastread.xpi * -r -mx=9 -xr\!.svn -x\!\*.bat -x\!\*.sh -x\!\*.xpi
