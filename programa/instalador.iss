; Instalador do BlackFlow, by BlackSolutions (Inno Setup 6)
; Gerado automaticamente pelo GitHub a cada versão publicada.

#ifndef Versao
  #define Versao "1.3.0"
#endif

#define Nome "BlackFlow"
#define Exe "BlackFlow.exe"

[Setup]
AppId={{6E3B2C1A-7F45-4C9B-9A2E-48D1C0F5B7A3}
AppName={#Nome}
AppVersion={#Versao}
AppVerName={#Nome} {#Versao}
AppPublisher=BlackSolutions
VersionInfoVersion={#Versao}
DefaultDirName={autopf}\BlackFlow
DefaultGroupName={#Nome}
DisableProgramGroupPage=yes
DisableDirPage=yes
PrivilegesRequired=lowest
OutputDir=saida
OutputBaseFilename=BlackFlow_Instalador
SetupIconFile=icone.ico
UninstallDisplayIcon={app}\{#Exe}
UninstallDisplayName={#Nome}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
RestartApplications=no
ArchitecturesInstallIn64BitMode=x64compatible

[InstallDelete]
; Remove o programa e os atalhos com o nome antigo (HappyFEET Gestão)
Type: files; Name: "{app}\HappyFEETGestao.exe"
Type: files; Name: "{userdesktop}\HappyFEET Gestão.lnk"
Type: filesandordirs; Name: "{userprograms}\HappyFEET Gestão"

[Languages]
Name: "ptbr"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "atalho"; Description: "Criar atalho na área de trabalho"; GroupDescription: "Atalhos:"

[Files]
Source: "dist\{#Exe}"; DestDir: "{app}"; Flags: ignoreversion
Source: "icone.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#Nome}"; Filename: "{app}\{#Exe}"; IconFilename: "{app}\icone.ico"
Name: "{group}\Desinstalar {#Nome}"; Filename: "{uninstallexe}"
Name: "{userdesktop}\{#Nome}"; Filename: "{app}\{#Exe}"; IconFilename: "{app}\icone.ico"; Tasks: atalho

[Run]
Filename: "{app}\{#Exe}"; Description: "Abrir o {#Nome} agora"; Flags: nowait postinstall
