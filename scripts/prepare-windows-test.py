#!/usr/bin/env python3
"""Assemble the user-copyable Windows test folder from a genuine Windows build."""
from pathlib import Path
import datetime
import hashlib
import json
import shutil
import struct
import os
import tempfile


from windows_delivery import replace_binary, publish_binary

root = Path(__file__).resolve().parent.parent
source = root / 'target/x86_64-pc-windows-msvc/release/fbones.exe'
data = source.read_bytes()
if data[:2] != b'MZ':
    raise SystemExit('Not a Windows executable: missing DOS header')
pe = struct.unpack_from('<I', data, 0x3c)[0]
if data[pe:pe + 4] != b'PE\0\0' or struct.unpack_from('<H', data, pe + 4)[0] != 0x8664:
    raise SystemExit('Expected an x64 Windows PE executable')
optional = pe + 24
if struct.unpack_from('<H', data, optional)[0] != 0x20b or struct.unpack_from('<H', data, optional + 68)[0] != 2:
    raise SystemExit('Expected PE32+ with Windows GUI subsystem')

destination = root / 'WINDOWS_TEST'
destination.mkdir(exist_ok=True)
executable, executable_hash = publish_binary(source, destination)
launcher_source = root / 'target/x86_64-pc-windows-msvc/release/fbones-launcher.exe'
if not launcher_source.is_file():
    raise SystemExit('Build the stable Windows launcher before preparing WINDOWS_TEST.')
launcher_data = launcher_source.read_bytes()
try:
    launcher_pe = struct.unpack_from('<I', launcher_data, 0x3c)[0]
    launcher_valid = (launcher_data[:2] == b'MZ'
        and launcher_data[launcher_pe:launcher_pe + 4] == b'PE\0\0'
        and struct.unpack_from('<H', launcher_data, launcher_pe + 4)[0] == 0x8664
        and struct.unpack_from('<H', launcher_data, launcher_pe + 24 + 68)[0] == 2)
except struct.error:
    launcher_valid = False
if not launcher_valid:
    raise SystemExit('Expected a genuine Windows x64 GUI bootstrap.')
replace_binary(launcher_source, destination / 'FBones.exe')
reference_source = root / 'target/x86_64-pc-windows-msvc/release/fbones-reference.exe'
if not reference_source.is_file():
    raise SystemExit('Build fbones-research for Windows before preparing the test folder.')
reference_data = reference_source.read_bytes()
reference_pe = struct.unpack_from('<I', reference_data, 0x3c)[0]
if reference_data[:2] != b'MZ' or reference_data[reference_pe:reference_pe + 4] != b'PE\0\0' or struct.unpack_from('<H', reference_data, reference_pe + 4)[0] != 0x8664:
    raise SystemExit('Expected a genuine Windows x64 reference collector.')
research = destination / 'FORMAT_TEST'
research.mkdir(exist_ok=True)
replace_binary(reference_source, research / 'fbones-reference.exe')
(research / 'Ruleaza-Testele.bat').write_bytes(
    b'@echo off\r\nsetlocal\r\npushd "%~dp0" || exit /b 1\r\n'
    b'"%~dp0fbones-reference.exe" %*\r\n'
    b'popd\r\necho.\r\npause\r\n')
(research / 'Verifica-Proiectele-Noastre.bat').write_bytes(
    b'@echo off\r\nsetlocal\r\npushd "%~dp0" || exit /b 1\r\n'
    b'"%~dp0fbones-reference.exe" --verify-generated %*\r\n'
    b'popd\r\necho.\r\npause\r\n')
(research / 'Verifica-Bones.bat').write_bytes(
    b'@echo off\r\nsetlocal\r\npushd "%~dp0" || exit /b 1\r\n'
    b'"%~dp0fbones-reference.exe" --verify-bones %*\r\n'
    b'popd\r\necho.\r\npause\r\n')
(research / 'CITESTE-MA.txt').write_text('''Unelte de cercetare a formatului FBones / Spine 4.3.26

Ambele loturi de 8 teste au trecut deja in Spine original, iar deschiderea
manuala a proiectului generat a fost confirmata. Si cele 4 teste bones au
trecut in Spine original. Nu trebuie repetate.

Aplicatia FBones 0.8.2 foloseste acum direct biblioteca noastra de format,
fara dependenta de Spine pentru crearea, salvarea sau redeschiderea proiectelor.
Verifica-Bones.bat pastreaza verificarea bones (lant, ramuri, reparentare si
nume Unicode) pentru regresii ulterioare.
Rezultatele raman aici si sunt accesibile direct agentului.
Uneltele anterioare sunt pastrate pentru cercetare ulterioara:
- Ruleaza-Testele.bat: genereaza referinte folosind instalarea originala Spine;
- Verifica-Proiectele-Noastre.bat: verifica proiectele generate de codec-ul nostru.
Ambele cer Spine 4.3.26 instalat si activat. Daca nu este gasit automat, ruleaza
fbones-reference.exe --help pentru optiunile de configurare.

Foloseste direct acest folder din workspace-ul WSL comun. Rezultatele apar
langa utilitar si sunt accesibile agentului; nu este necesara copierea manuala.
Daca ai rulat din vechiul folder de pe Desktop, agentul poate citi rezultatele
direct de acolo. Originalele si datele de activare nu sunt distribuite aici.
''', encoding='utf-8')
shutil.copyfile(root / 'scripts/windows-start.ps1', destination / 'Start-FBones.ps1')
(destination / 'Porneste-FBones.bat').write_bytes(
    b'@echo off\r\nsetlocal\r\n'
    b'powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-FBones.ps1"\r\n'
    b'if errorlevel 1 pause\r\n')
(destination / 'CITESTE-MA.txt').write_text('''FBones 0.8.2 - Windows x64

Deschide shortcut-ul Desktop "FBones - aplicatie" pentru buildul actualizat din
workspace. Inchide fereastra veche si deschide din nou; verifica Version 0.8.2
in subsol. Nu trebuie copiat folderul si nu trebuie instalate Node/Rust/pnpm.
Pentru mesajul "Windows cannot find" al unui shortcut vechi, deschide folderul
WINDOWS_TEST prin unitatea mapata W: si ruleaza Porneste-FBones.bat.
scripts/windows-workspace-shortcuts.bat poate actualiza shortcut-urile cand il
rulezi tu pe Windows. Agentul nu scrie pe Desktop.

Ce poti testa:
- New project: creeaza un proiect cu un root bone;
- Save sau Ctrl+S: salveaza proiectul ca .fbones;
- Save As din File / Ctrl+Shift+S: alege alt fisier;
- File > Close project, apoi Open project: redeschide fisierul salvat;
- numele, calea si indicatorul de modificari nesalvate dupa salvare;
- Save and continue / Discard / Cancel cand parasesti un proiect nesalvat.

Formatul minim a fost verificat cu Spine original 4.3.26, inclusiv deschiderea
unui .spine identic cu proiectul generat de noi. Fisierele cu date inca
nesuportate se deschid in Inspection only si pot fi copiate fara modificari.
Nu pretindem compatibilitate completa cu toate proiectele Spine.

Interfata Setup:
- viewport cu checkerboard in stanga; Weights, Mesh Tools si Tree/Properties in dreapta;
- Views arata/ascunde coloanele; trage separatorul pentru redimensionare;
- bara contextuala de jos afiseaza uneltele de transformare sau de editare mesh;
- HUD-ul numeric centrat arata valorile Local ale osului activ; Enter aplica,
  Escape abandoneaza valoarea in curs. La selectie multipla modifica doar osul activ;
- fiecare build porneste din propriul folder builds/<hash>, evitand cache-ul
  imaginilor executabile Windows pe share-ul WSL. Foloseste Porneste-FBones.bat.


Parenting si panouri (actualizarea F309):
- P sau Parent: alege un bone nou prin click in viewport sau Tree; Escape anuleaza;
- selectiile de oase/imagine se muta intr-un singur pas Undo, pastrand geometria Setup;
- daca muti numai unele alternative, celelalte raman in slotul lor; sloturile
  separate pastreaza activarea, culoarea si blendingul;
- New din Tree deschide Slot, Clipping, IK, Transform si Physics;
- Views: IK, Transform si Physics au panouri proprii cu alegerea constrangerii;
  deschiderea panoului nu creeaza automat o constrangere. Gravity este in Physics;
- trage antetul unui panou pe zonele de plasare; manerele schimba latimea/inaltimea;
- Views > Reset layout restabileste asezarea initiala; aranjarea se pastreaza local;
- Project metadata a fost eliminat din Properties; proprietatile selectiei raman.

Imagini, sloturi si draw order:
- slotul poate avea mai multe attachment-uri: doar unul sau niciunul este activ;
- selectarea randului unei imagini nu o activeaza. Agrafa activeaza/dezactiveaza;
- trage PNG-uri pe un slot existent pentru alternative, fara sloturi noi;
- Owner slot schimba proprietarul attachment-ului pastrand geometria world;
  destinatia isi pastreaza attachment-ul activ, culoarea/blendingul si draw order;
- Ctrl/Cmd-click si marquee selecteaza imagini deja plasate; Translate/Rotate/Scale
  lucreaza ca grup in World, intr-un singur pas Undo;
- filtrele Bones/Slots/Attachments/Constraints din Tree se pot combina;
- Slot Properties: RGBA si Normal/Additive/Multiply/Screen afecteaza regiuni si meshuri;
- in Tree > Images apasa pictograma folder sau calea pentru a alege folderul PNG;
- subfolderele apar in Tree; Refresh reciteste biblioteca dupa schimbari pe disc;
- alegerea folderului NU creeaza sloturi. Trage un PNG in viewport pentru a crea
  un slot cu attachment la pozitia aleasa, sub root, conform fluxului documentat Spine;
- Ctrl/Cmd-click adauga/elimina PNG-uri din selectie; Shift-click selecteaza un interval;
- trage un PNG deja selectat pentru a plasa intreaga selectie fara a o pierde;
- primul centru este punctul de drop; restul sunt asezate intr-o grila cu maximum
  patru coloane; celula foloseste dimensiunile PNG maxime plus 16 unitati world;
- toate imaginile dintr-un drop folosesc un singur pas Undo. Daca lipseste un asset,
  proiectul s-a schimbat sau este depasita limita de sloturi, nu se plaseaza nimic;
- alegerea PNG-urilor pastreaza selectia oaselor; dupa plasare este retinuta
  destinatia efectiva (root in viewport, osul indicat la drop in Tree);
- poti trage PNG-ul direct peste un bone in Tree pentru a-l plasa la originea lui;
- nu exista butonul separat Import PNG; porneste din biblioteca Images;
- Images: trage pentru mutare; Attachment Properties: X/Y, rotatie, scale si Owner slot;
  agrafa controleaza attachment-ul activ; Slot Properties controleaza tintul;
- trage un slot peste alt bone in Tree pentru a-i schimba parintele, pastrand
  aspectul. Daca este necesar shear local, imaginea devine automat un quad mesh;
- tabul Draw order permite drag and drop sau sageti; randul de sus este in fata;
- prima salvare si Save As copiaza intreaga biblioteca activa in images/ langa
  proiect, inclusiv PNG-uri neplasate si subfolderele lor;
- Save obisnuit pastreaza referinta activa; nu scrie in folderul sursa ales;
- o imagine diferita existenta nu este suprascrisa; coliziunile opresc salvarea;
- undo/redo pastreaza biblioteca, sloturile, bindings si draw order.

Bones:
- B / Create: click pe un bone existent alege parintele; trage pentru un bone nou;
- un click fara drag in spatiu liber creeaza un bone scurt;
- Ctrl/Cmd-click sau Shift-click selecteaza mai multe oase; poti selecta si prin
  dreptunghi tras in spatiul liber;
- bara de jos: Translate (V), Rotate (C), Scale (X), Shear (Z), Pose (buton), Length (L);
- gizmo-uri vizibile: sageti world pentru mutare, inel pentru rotatie,
  manere pe axele locale pentru Scale si manere separate pentru Shear;
- Rotate Individual (implicit): fiecare os selectat de nivel superior se roteste
  in jurul propriei origini. Optiunea Group foloseste centrul comun al originilor;
- Scale modifica scale X/Y pe axele locale proprii ale fiecarui os, inclusiv
  cand selectia contine oase cu orientari diferite;
- copiii unui os deja selectat urmeaza parintele o singura data. HUD-ul numeric
  ramane Local si modifica osul activ, nu aplica o transformare de grup;
- Pose: trage corpul osului pentru rotatie fara lungire; originea pentru mutare;
- Length: trage varful pentru lungime fara a modifica rotatia;
- Escape anuleaza gestul sau deselecteaza si revine la Translate;
- inspector: nume, parinte, X/Y, rotatie, lungime, scale si shear; Enter aplica;
- F2, dublu-click pe numele din Tree sau Rename permite redenumirea;
- Color seteaza culoarea osului; Auto color atribuie nuante inrudite copiilor;
- drag and drop pe alt bone in Tree reparenteaza pastrand transformarea vizuala;
- Delete sterge osul si descendentii numai dupa eliminarea/reasignarea referintelor
  din sloturi, bindings si constraints; root nu poate fi sters sau reparentat;
- H / Space + drag / butonul din mijloc: pan; scroll: zoom;
- Ctrl+Z / Ctrl+Shift+Z (sau Ctrl+Y): undo / redo, un pas pentru fiecare gest.

Mesh-uri:
- selecteaza imaginea plasata, apoi Convert to mesh; Edit mesh deschide uneltele;
- bara contextuala: Modify muta puncte; Create adauga puncte conectate si muchii;
- Create: click creeaza un punct conectat; trage dintr-un punct pentru un segment,
  sau elibereaza peste un punct existent pentru a le conecta;
- Remove elimina punctul sau muchia interna; muchiile de contur definesc hull-ul;
- Deformed debifat = Setup: mutarea modifica UV-urile si optimizeaza triunghiurile;
- Deformed bifat: muta geometria pastrand UV-urile si topologia;
- Soft selection, Size si Feather controleaza vecinii mutati;
- Triangulate si Reset to quad sunt disponibile in Mesh Tools.

Trace / Inner trace:
- Trace afiseaza mai intai o previzualizare; Cancel nu modifica proiectul;
- Alpha ignore elimina pixelii cu alpha mic, util pentru umbre slabe;
- Tolerance, Spacing si Vertices max controleaza simplificarea conturului;
- Inner trace cauta granite interne de culoare; Contrast, Tolerance si Spacing
  controleaza detaliile si reduc zgomotul. Este algoritmul nostru, nu o promisiune
  de rezultat identic cu tracerul proprietar Spine;
- Apply inlocuieste mesh-ul intr-un singur pas Undo. Pe un mesh legat interpoleaza
  greutatile existente; verifica deformarea dupa aplicare;
- gaurile transparente raman transparente in textura, dar sunt umplute de geometrie;
- insulele separate sunt legate printr-o punte convexa transparenta; UI raporteaza
  gaurile/insulele si simplificarea impusa de buget;
- limita este 256 vertecsi/mesh. Un contur prea complex poate fi refuzat.

Greutati:
- exemplu propriu: EXAMPLES/weighted-clipping-b6bd5bd87428/Demo.fbones,
  cu folderul images alaturi; il poti deschide din File > Open project;
- selecteaza un mesh sau clipping in Tree; Weights functioneaza si pentru
  atasamentele inactive, fara sa le activeze;
- bifeaza oasele si Bind pentru a le lega. Primul os primeste greutatea initiala,
  cele adaugate ulterior pornesc la zero; Auto distribuie greutatile separat;
- la un atasament rigid, osul proprietar nu este afisat ca os deja bindat;
- Unbind revine la proprietar, pastrand forma afisata;
- Auto foloseste topologia suprafetei, pentru intregul atasament si toate oasele
  bindate. Nu modifica automat coordonatele de bind existente; nu este o
  promisiune de rezultat numeric identic cu Auto proprietar din Spine;
- Direct: selecteaza un vertex si influenta, apoi editeaza Weight numeric/slider
  sau trage vertical. Shift ofera reglaj fin; Direct nu foloseste raza pensulei;
- Add / Remove / Replace / Smooth folosesc Strength, Size si Feather;
- Replace foloseste Strength ca valoare tinta, inclusiv zero;
- o influenta de 100% nu scade daca nicio alta influenta nu are greutate;
- Normalize este un control FBones pentru normalizarea tuturor vertexurilor;
- o trasare de pensula sau un drag inseamna un singur pas Undo;
- treci mai intai in Bones, apoi selecteaza si muta osul pentru a vedea
  deformarea mesh-ului sau clippingului. In Weights, un click pe os in Tree
  alege influenta, pastrand atasamentul selectat;
- profilul curent: PNG, 256 vertecsi/mesh, 4096 total, 128 bones/slots;

Clipping:
- Tree > New > Slot pentru un slot gol, apoi New > Clipping attachment;
- alege Owner si End, deseneaza punctele in viewport si inchide cu primul punct
  sau Finish polygon/Enter. Cancel/Escape abandoneaza poligonul nefinalizat;
- End este inclusiv; End=Owner inseamna restul draw order;
- Convex si Inverse sunt salvate independent; Inverse decupeaza exteriorul
  invelisului convex, conform randarilor verificate in originalul 4.3.26;
- Edit clipping: Modify muta puncte, Create insereaza pe muchii, Remove sterge;
- Translate/Rotate/Scale din Edit clipping trec la transformarea intregului
  atasament, pastrand selectia si activarea; V/C/X folosesc aceeasi cale;
- atasamentele inactive selectate au contururi si comenzi de transformare;
  acestea nu activeaza alternativele si nu adauga imagini in randare;
- la Rotate/Scale, trage crucea centrala pentru a muta pivotul temporar;
  langa un vertex, pivotul se fixeaza pe acesta. Mutarea lui nu creeaza Undo;
- o agrafa dezactivata opreste clippingul; intervalele active suprapuse sunt refuzate.

IK, Transform si Physics:
- Tree > New creeaza constrangerea; inspectorul alege oasele si target/source;
- IK poate controla un os sau un lant parinte/copil de doua oase;
- Transform include mapari intre proprietati, spatii Local separate,
  offsets/mix, Additive si Clamp; ordinea constraints se poate modifica in Tree;
- Physics are Run/Pause, Step 1/60 s si Reset, plus forte/mase/damping/inertie;
- simularea nu scrie pose-ul calculat peste valorile Setup si nu murdareste
  proiectul. Dragul oaselor reactioneaza in preview; editarea geometriei
  ingheata un pose verificat in Rust, fara transferul scenei in fiecare frame;
- setarile si ordinea sunt salvate; vitezele si ceasul live sunt temporare;
- comparatia physics pentru miscarea parintelui are inca o diferenta de faza
  investigata; nu declarăm echivalenta completa a simularii cu Spine.

Animatiile/timeline, alte moduri de mostenire, skins si datele necunoscute
raman nesuportate / Inspection only. Nu este compatibilitate completa Spine.

Aplicatia foloseste Microsoft Edge WebView2, componenta de afisare Tauri.
In 0.6.1 interceptarea nativa Tauri a drop-ului Windows este dezactivata pentru
ca drag and drop HTML cu mouse real sa ajunga la editor. Testul sintetic vechi
nu acoperea aceasta interceptare; verifica noul build folosind mouse-ul real.
Acesta este un build intern nesemnat. Porneste-FBones.bat foloseste maparea
existenta W: a Ubuntu cand este disponibila. Agentul poate actualiza folderul,
citi rezultatele si deschide aplicatia direct pe Windows.
Verificarile efective pentru 0.8.2 sunt consemnate in docs/STATE.md; rezultatele
Windows din versiunile anterioare nu confirma automat fiecare interactiune noua.
Backend-ul Linux este testat aici; GUI Linux ramane neverificat. macOS nu a fost
construit sau verificat. Codul comun nu reprezinta o verificare pe toate platformele.
''', encoding='utf-8')
version = json.loads((root / 'package.json').read_text())['version']
manifest = {
    'product': 'FBones', 'version': version, 'target': 'x86_64-pc-windows-msvc',
    'builtAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'binary': executable, 'launcher': 'FBones.exe',
    'launcherSha256': hashlib.sha256(launcher_source.read_bytes()).hexdigest(), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
    'guiSubsystem': True, 'crt': 'static', 'uiEmbedded': True,
    'nativeWindowsLaunchVerified': False, 'newProjectSavingAvailable': True,
    'saveProfile': 'canonical Scene: affine bones/colors, PNG folders, slots with multiple region/mesh/clipping alternatives, active/none, dense bindings and ordered IK/Transform/Physics settings; unknown documents remain inspection-only',
    'minimalProfileOriginalSpineCliAccepted': True,
    'minimalProfileOriginalSpineGuiUserConfirmed': True,
    'executable': executable,
    'meshEditingAvailable': True, 'weightEditingAvailable': True,
    'imageLibraryAvailable': True, 'meshTracingAvailable': True,
    'innerTraceAvailable': True, 'boneAffineEditingAvailable': True,
    'assetMultiselectionAvailable': True, 'multiImagePlacementAvailable': True,
    'localScaleGizmosAvailable': True, 'multipleAttachmentsPerSlotAvailable': True,
    'sceneImageMultiselectionAvailable': True, 'treeCategoryFiltersAvailable': True,
    'inactiveAttachmentGizmosAvailable': True, 'clippingWholeTransformsAvailable': True,
    'movableAttachmentPivotAvailable': True,
    'weightedClippingAuthoringAvailable': True, 'directWeightEditingAvailable': True,
    'sceneBindImplicitAuto': False, 'sceneWeightEditsPreserveAllBindingPositions': True,
    'attachmentReparentAvailable': True, 'clippingEditingAvailable': True,
    'ikConstraintsAvailable': True, 'transformPropertyMappingsAvailable': True,
    'physicsSetupPreviewAvailable': True, 'fullPhysicsReferenceParityVerified': False,
    'affineProfileOriginalSpineCliAccepted': True,
    'traceProfileOriginalSpineCliAccepted': True,
    'meshProfileOriginalSpineCliAccepted': True,
    'spineReference': '4.3.26', 'boneEditingAvailable': True, 'boneHistoryLimit': 100,
    'imageEditingAvailable': True, 'regionProfileOriginalSpineCliAccepted': True,
    'referenceCollector': 'FORMAT_TEST/fbones-reference.exe',
    'referenceCollectorSha256': hashlib.sha256(reference_data).hexdigest(),
}
with tempfile.NamedTemporaryFile(mode='w', dir=destination, prefix='.fbones-manifest-', delete=False) as file:
    file.write(json.dumps(manifest, indent=2) + '\n')
    file.flush()
    os.fsync(file.fileno())
    temporary_manifest = Path(file.name)
os.replace(temporary_manifest, destination / 'build-info.json')
with tempfile.NamedTemporaryFile(mode='w', dir=destination, prefix='.fbones-pointer-', delete=False) as file:
    file.write(executable_hash + '\n')
    file.flush()
    os.fsync(file.fileno())
    temporary_pointer = Path(file.name)
os.replace(temporary_pointer, destination / 'current-build.txt')
print(json.dumps(manifest, indent=2))
