; ==============================================================================
; NastyMap NSIS Windows Installer Script
; Nullsoft Scriptable Install System (NSIS) for NastyMap Network Mapper GUI
; ==============================================================================

!include "MUI2.nsh"
!include "FileFunc.nsh"

; General Configuration
Name "NastyMap"
OutFile "NastyMap-Setup-1.0.0.exe"
InstallDir "$PROGRAMFILES64\NastyMap"
InstallDirRegKey HKLM "Software\NastyMap" "Install_Dir"
RequestExecutionLevel admin

; Version Information
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "NastyMap"
VIAddVersionKey "Comments" "Nmap Graphical Display & Topology Visualizer"
VIAddVersionKey "CompanyName" "NastyMap Project"
VIAddVersionKey "LegalCopyright" "Copyright (C) 2026 NastyMap Team"
VIAddVersionKey "FileDescription" "NastyMap Installer"
VIAddVersionKey "FileVersion" "1.0.0.0"

; Interface Settings
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Header\win.bmp"

; Installer Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "..\LICENSE"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Uninstaller Pages
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "English"

; ------------------------------------------------------------------------------
; Core Application Section
; ------------------------------------------------------------------------------
Section "NastyMap Core (Required)" SecCore
  SectionIn RO

  ; Set output path to the installation directory
  SetOutPath "$INSTDIR"

  ; Copy application binaries, assets and documentation
  File /r "..\apps\nastymap-example\.next\standalone\*.*"
  File "..\README.md"
  File "..\LICENSE"

  ; Write installation path to registry
  WriteRegStr HKLM "Software\NastyMap" "Install_Dir" "$INSTDIR"

  ; Write Uninstaller registry keys for Add/Remove Programs
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\NastyMap" "DisplayName" "NastyMap - Nmap Network Mapper GUI"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\NastyMap" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\NastyMap" "DisplayIcon" "$INSTDIR\nastymap.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\NastyMap" "DisplayVersion" "1.0.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\NastyMap" "Publisher" "NastyMap Team"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\NastyMap" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\NastyMap" "NoRepair" 1

  ; Associate .xml / .nmap files with NastyMap
  WriteRegStr HKCR ".nastymap" "" "NastyMap.Scan"
  WriteRegStr HKCR "NastyMap.Scan" "" "Nmap XML Scan File"
  WriteRegStr HKCR "NastyMap.Scan\DefaultIcon" "" "$INSTDIR\nastymap.exe,0"
  WriteRegStr HKCR "NastyMap.Scan\shell\open\command" "" '"$INSTDIR\nastymap.exe" "%1"'

  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

; ------------------------------------------------------------------------------
; Start Menu Shortcuts
; ------------------------------------------------------------------------------
Section "Start Menu Shortcuts" SecStartMenu
  CreateDirectory "$SMPROGRAMS\NastyMap"
  CreateShortcut "$SMPROGRAMS\NastyMap\NastyMap.lnk" "$INSTDIR\nastymap.exe" "" "$INSTDIR\nastymap.exe" 0
  CreateShortcut "$SMPROGRAMS\NastyMap\Uninstall NastyMap.lnk" "$INSTDIR\uninstall.exe" "" "$INSTDIR\uninstall.exe" 0
  CreateShortcut "$SMPROGRAMS\NastyMap\Documentation.lnk" "$INSTDIR\README.md"
SectionEnd

; ------------------------------------------------------------------------------
; Desktop Shortcut
; ------------------------------------------------------------------------------
Section "Desktop Shortcut" SecDesktop
  CreateShortcut "$DESKTOP\NastyMap.lnk" "$INSTDIR\nastymap.exe" "" "$INSTDIR\nastymap.exe" 0
SectionEnd

; ------------------------------------------------------------------------------
; Uninstaller Section
; ------------------------------------------------------------------------------
Section "Uninstall"
  ; Remove Registry keys
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\NastyMap"
  DeleteRegKey HKLM "Software\NastyMap"
  DeleteRegKey HKCR ".nastymap"
  DeleteRegKey HKCR "NastyMap.Scan"

  ; Remove shortcuts
  Delete "$DESKTOP\NastyMap.lnk"
  Delete "$SMPROGRAMS\NastyMap\*.*"
  RMDir "$SMPROGRAMS\NastyMap"

  ; Remove files and installation directory
  RMDir /r "$INSTDIR"
SectionEnd
