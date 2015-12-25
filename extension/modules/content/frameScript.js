/**
 * @fileOverview Frame script framework.
 */

(function()
{
	const Cc = Components.classes;
	const Ci = Components.interfaces;
	const Cr = Components.results;
	const Cu = Components.utils;

	let {Loader, main, unload} = Cu.import("resource://gre/modules/commonjs/toolkit/loader.js", {});
	let {Services} = Cu.import("resource://gre/modules/Services.jsm", {});

	let loader = null;

	let shutdownHandlers = [];
	let onShutdown =
	{
		done: false,
		add: function(handler)
		{
			if (shutdownHandlers.indexOf(handler) < 0)
				shutdownHandlers.push(handler);
		},
		remove: function(handler)
		{
			let index = shutdownHandlers.indexOf(handler);
			if (index >= 0)
				shutdownHandlers.splice(index, 1);
		}
	};

	let callbackPrefix = Services.appinfo.processID + " ";
	let maxCallbackID = 0;
	let callbacks = new Map();

	function sendSyncMessageSingleResponse(messageName, data)
	{
		return sendSyncMessage(messageName, {data})[0];
	}

	function sendAsyncMessageWithResponse(messageName, data, callback)
	{
		data = {data};
		if (callback)
		{
			let callbackID = callbackPrefix + (++maxCallbackID);
			callbacks.set(callbackID, callback);
			data.callbackID = callbackID;
		}
		sendAsyncMessage(messageName, data);
	}

	function sendAsyncMessageWrapper(messageName, data, cpow)
	{
		// Pack into an object
		data = {data};
		sendAsyncMessage(messageName, data, cpow);
	}

	function onResponse(message)
	{
		let {callbackID, response} = message.data;
		if (callbacks.has(callbackID))
		{
			let callback = callbacks.get(callbackID);
			callbacks.delete(callbackID);
			callback(response);
		}
	}

	function init(info)
	{
		// May need to add docShell here later.
		loader = Loader({
			paths: {
				"": info.addonRoot + "modules/"
			},
			globals: {
				Components, Cc, Ci, Cu, Cr, atob, btoa, dump, onShutdown,
				content, addEventListener, removeEventListener,
				addMessageListener, removeMessageListener,
				sendAsyncMessage: sendAsyncMessageWrapper, sendAsyncMessageWithResponse,
				sendSyncMessage: sendSyncMessageSingleResponse
			},
			modules: {"info": info},
			id: info.addonID
		});
		onShutdown.add(() => unload(loader, "disable"));

		main(loader, "content/main");
	}

	function shutdown(message)
	{
		if (message.data == Components.stack.filename)
		{
			onShutdown.done = true;
			for (let i = shutdownHandlers.length - 1; i >= 0; i --)
			{
				try
				{
					shutdownHandlers[i]();
				}
				catch (e)
				{
					Cu.reportError(e);
				}
			}
			shutdownHandlers = null;
		}
	}

	sendAsyncMessageWithResponse("salastread:GetInfo", null, init);
	addMessageListener("salastread:Response", onResponse);
	addMessageListener("salastread:Shutdown", shutdown);
	onShutdown.add(() => {
		removeMessageListener("salastread:Response", onResponse);
		removeMessageListener("salastread:Shutdown", shutdown);
	});

})();
