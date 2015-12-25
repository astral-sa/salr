/**
 * @fileOverview Manages timer for time spent on SA.
 */

let {Prefs} = require("prefs");
let {Utils} = require("utils");

let Timer = exports.Timer =
{
	/**
	 * Number of currently-open SA pages.
	 * @type {Number}
	 */
	_timerPageCount: 0,
	/**
	 * The current value for time spent on SA.
	 * @type {Number}
	 */
	_TimerValue: 0,
	/**
	 * The timer value to next save time spent on SA.
	 * @type {Number}
	 */
	_TimerValueSaveAt: 0,
	/**
	 * Exists to verify something hasn't gone horribly wrong before saving timer value.
	 * @type {Bool}
	 */
	_TimerValueLoaded: false,
	/**
	 * Keeps track of the last value the timer was pinged. Probably unnecessary now.
	 * @type {Number}
	 */
	_LastTimerPing: 0,
	/**
	 * Our instance of nsITimer.
	 * @type {Object}
	 */
	ourTimer: null,
	/**
	 * Whether or not our timer is active.
	 * @type {Bool}
	 */
	_timerActive: false,

	/**
	 * Callback function for timer ticks.
	 * @type {Object}
	 */
	timerEvent:{
		notify: function(timer)
		{
			if (timer === Timer.ourTimer)
				Timer.PingTimer();
		}
	},

	/**
	 * Creates our timer instance.
	 */
	init: function()
	{
		// Get Initial Timer Value
		try { this._TimerValue = Prefs.getPref("timeSpentOnForums"); } catch(xx) { }
		if ( ! this._TimerValue ) {
			this._TimerValue = 0;
		}
		this._TimerValueSaveAt = this._TimerValue + 60;
		this._TimerValueLoaded = true;

		// nsITimer implementation
		Timer.ourTimer = Components.classes["@mozilla.org/timer;1"]
			.createInstance(Components.interfaces.nsITimer);

		// Add listeners for loads/unloads
		Utils.addFrameMessageListener("salastread:TimerCountInc", () => { Timer.incrementPageCount(); });
		Utils.addFrameMessageListener("salastread:TimerCountDec", () => { Timer.decrementPageCount(); });

		onShutdown.add(function() {
			if (Timer._timerActive)
				Timer.ourTimer.cancel();
		});
	},

	/**
	 * Increments the count of open SA forum pages. Starts timer if needed.
	 */
	incrementPageCount: function()
	{
		Timer._timerPageCount++;
		if (Timer._timerPageCount >= 1 && Timer._timerActive === false)
			Timer.startTimer();
	},

	/**
	 * Decrements the count of open SA forum pages. Stops timer if 0 pages.
	 *     Ensures timer value is saved.
	 */
	decrementPageCount: function()
	{
		if (Timer._timerPageCount <= 0)
			return;
		Timer._timerPageCount--;
		if (Timer._timerPageCount === 0)
			Timer.clearTimer();
		Timer.SaveTimerValue();
	},

	/**
	 * Instructs our timer to begin ticking. We run PingTimer every 30s.
	 */
	startTimer: function()
	{
		Timer._timerActive = true;
		Timer.ourTimer.initWithCallback(Timer.timerEvent, 30000, 1); // TYPE_REPEATING_SLACK
	},

	/**
	 * Instructs our timer to stop ticking.
	 */
	clearTimer: function()
	{
		Timer._timerActive = false;
		Timer.ourTimer.cancel();
	},

	/**
	 * Updates our timer value. Saves it every 60s.
	 */
	PingTimer: function()
	{
		var nowtime = (new Date()).getTime();
		if ( this._LastTimerPing < nowtime-30000 ) {
			this._TimerValue += 30;
			this._LastTimerPing = nowtime;
			if ( this._TimerValue >= this._TimerValueSaveAt ) {
				this.SaveTimerValue();
			}
		}
	},

	// Saves the time spent on the forums so far and flags to save in another 60 seconds
	// @param: nothing
	// @return: nothing
	SaveTimerValue: function()
	{
		if (this._TimerValueLoaded)
		{
			Prefs.setPref("timeSpentOnForums", this._TimerValue);
		}
		this._TimerValueSaveAt = this._TimerValue + 60;
	},

};
Timer.init();
