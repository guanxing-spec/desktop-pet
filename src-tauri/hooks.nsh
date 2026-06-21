!macro NSIS_HOOK_POSTINSTALL
  CreateShortCut "$DESKTOP\桌面显眼包.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  Delete "$DESKTOP\桌面显眼包.lnk"
!macroend
