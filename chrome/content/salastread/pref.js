function SALR_Prefs_Accept()
{
	RebuildSAMenus();
	return true;
}

function SALR_Prefs_Close()
{
	// The prefwindow was closed or canceled, but instantApply was true
	if (document.getElementById('salastreadpref').instantApply)
	{
		RebuildSAMenus();
	}
}