
// TimeManager is the master time management object.
function SALastRead_TimeManager() {
}

SALastRead_TimeManager.prototype = {
   // Contains the StartDate of the pages that are currently open
   // in the browser.
   _OpenTimes: new Array(),

   // Adds a new StartDate into the _OpenTimes array. Will fill in empty
   // spots in the _OpenTimes array. The _OpenTimes array can never be
   // shrunk since the indexes need to be preserved.
   _InsertIntoTimes: function(dateObj) {
      for (var i=0; i<this._OpenTimes.length; i++) {
         if (!this._OpenTimes[i]) {
            this._OpenTimes[i] = dateObj;
            return i;
         }
      }
      this._OpenTimes.push(dateObj);
      return this._OpenTimes.length-1;
   },

   // This removes a time from the _OpenTimes list.
   _RemoveOpenTime: function(timeIndex) {
      this._OpenTimes[timeIndex] = null;
   },

   // Contains the date ranges that have been allocated by previous pages.
   // These are kept so that future pages can be checked and have any
   // overlapping time ranges removed from their time count.
   _LiveRanges: new Array(),

   // Adds a new date range into the _LiveRanges list.
   _AddToLiveRanges: function(rangeObj) {
      this._LiveRanges.push(rangeObj);
   },

   // Removes date ranges that are older than the oldest currently open
   // page, since they'll no longer collide with any page date ranges.
   // When they are removed, they are added to the overall time count.
   _PruneLiveRanges: function() {
      var newLiveRanges = new Array();
      for (var i=0; i<this._LiveRanges.length; i++) {
         var keepThis = 0;
         for (var j=0; j<this._OpenTimes.length; j++) {
            if ( this._OpenTimes[j]!=null ) {
               if (this._LiveRanges[i]._EndDate >= this._OpenTimes[j]) {
                  keepThis = 1;
               }
            }
         }
         if (keepThis==0) {
            this._AddRangeToOverallCount(this._LiveRanges[i]);
            this._LiveRanges[i] = null;
         } else {
            newLiveRanges.push(this._LiveRanges[i]);
         }
      }
      this._LiveRanges = newLiveRanges;
   },

   // This function takes a date range and converts it to seconds,
   // and adds it to the overall "time spent on forums" counter.
   _AddRangeToOverallCount: function(rangeObj) {
      var rangeSecs = rangeObj.ConvertToSeconds();
      var pobj = Components.classes["@mozilla.org/preferences-service;1"].
                    getService(Components.interfaces.nsIPrefBranch);
      var timeSpent = 0;
      if ( pobj.getPrefType("salastread.timespent")==pobj.PREF_INT ) {
         timeSpent = pobj.getIntPref("salastread.timespent");
      }
      timeSpent += rangeSecs;
      pobj.setIntPref("salastread.timespent", timeSpent);
   },

   // This function takes a single range and chops it against all the
   // previous date ranges in the _LiveRanges list. This will return
   // an array of all the date ranges that didn't overlap an existing
   // range.
   _ChopRange: function(rangeObj) {
      var curRanges = new Array(rangeObj);
      for (var i=0; i<this._LiveRanges.length; i++) {
         var thisres = new Array();
         for (var j=0; j<curRanges.length; j++) {
            var jres = curRanges[j].ClipAgainst(this._LiveRanges[i]);
            for (var k=0; k<jres.length; k++) {
               thisres.push(jres[k]);
            }
         }
         curRanges = thisres;
         thisres = new Array();
      }
      return curRanges;
   },

   // This creates a new PageTimer object for a new page being displayed
   // in the browser.
   GetStart: function() {
      try {
         var nowDate = new Date();
         var myIndex = this._InsertIntoTimes(nowDate);
         return new SALastRead_PageTimer(this,nowDate,myIndex);
      } catch(e) {
         alert("GetStart error: "+e);
         return null;
      }
   }
};

// PageTimer is an object that keeps track of the time range a single
// page is displayed in a browser window.
function SALastRead_PageTimer(parentObj,startDate,initIndex) {
   this._ParentObject = parentObj;
   this._ParentIndex = initIndex;
   this._StartDate = startDate;
}

SALastRead_PageTimer.prototype = {
   // Contains the TimeManager object
   _ParentObject: null,  // set in constructor

   // Contains the index into the parent's _LiveRanges array
   _ParentIndex: null,   // set in constructor

   // Contains the Date object representing the date this page was loaded.
   _StartDate: null,     // set in constructor

   _wasFinalized: false,

   // Called when this page is unloaded. It chops the range down to the
   // time ranges exclusive to this page, then adds them to the parent's
   // _LiveRanges list.
   Finalize: function() {
      try {
      if (this._wasFinalized) {
         return;
      }
      this._wasFinalized = true;
      var finalDate = new Date();
      var myRange = new SALastRead_DateRange(this._StartDate, finalDate);
      // If this page was open for more than 30 minutes, consider it dead and
      // not to be counted.
      if ( myRange.ConvertToSeconds() < 60*30 ) {
         var choppedRanges = this._ParentObject._ChopRange(myRange);
         for (var i=0; i<choppedRanges.length; i++) {
            this._ParentObject._AddToLiveRanges(choppedRanges[i]);
         }
      }
      this._ParentObject._RemoveOpenTime(this._ParentIndex);
      this._ParentObject._PruneLiveRanges();
      //alert("live ranges remaining: " + this._ParentObject._LiveRanges.length +
      //   "\nopen times remaining: " + this._ParentObject._OpenTimes.length);
      }
      catch (e) {
         if (typeof(e)=="object") {
            var errstr = "";
            for (var tn in e) {
               errstr += tn+": "+e[tn]+"\n";
            }
            alert("Finalize err: "+errstr);
         } else {
            alert("Finalize err: "+e);
         }
      }
   }
};

// DateRange represents a span of time from a start datetime to an
// end datetime.
function SALastRead_DateRange(startDate, endDate) {
   this._StartDate = startDate;
   this._EndDate = endDate;
}

SALastRead_DateRange.prototype = {
   // Contains a Date object representing the start of this range.
   _StartDate: null,   // set in constructor

   // Contains a Date object representing the end of this range.
   _EndDate: null,     // set in constructor

   // Clips this Date object against another Date object. An array of
   // DateRange objects is returned, representing the time ranges that
   // were in this object that were not overlapped by the other object.
   ClipAgainst: function(otherObj) {
      // ============
      //        -------------
      if (otherObj._StartDate <= this._StartDate &&
          otherObj._EndDate <= this._EndDate) {
         if (otherObj._StartDate == this._StartDate &&
             otherObj._EndDate == this._EndDate) {
            return new Array();
         }
         var resObj = new SALastRead_DateRange(otherObj._EndDate, this._EndDate);
         return new Array(resObj);
      }
      //        =============
      // ------------
      if (otherObj._StartDate >= this._StartDate &&
          otherObj._EndDate >= this._EndDate) {
         var resObj = new SALastRead_DateRange(this._StartDate, otherObj._StartDate);
         return new Array(resObj);
      }
      // ====================
      //     -----------
      if (otherObj._StartDate <= this._StartDate &&
          otherObj._EndDate >= this._EndDate) {
         return new Array();
      }
      //     ===========
      // --------------------
      if (otherObj._StartDate >= this._StartDate &&
          otherObj._EndDate <= this._EndDate) {
         var result = new Array();
         if (otherObj._StartDate != this._StartDate) {
            result.push(new SALastRead_DateRange(this._StartDate, otherObj._StartDate));
         }
         if (otherObj._EndDate != this._EndDate) {
            result.push(new SALastRead_DateRange(otherObj._EndDate, this._EndDate));
         }
         return result;
      }
      // else
      return new Array(this);
   },

   ConvertToSeconds: function() {
      var startMs = this._StartDate.getTime();
      var endMs = this._EndDate.getTime();
      var diffMs = endMs - startMs;
      return Math.ceil(diffMs/1000);
   }
};
