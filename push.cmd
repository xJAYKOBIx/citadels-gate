@echo off
REM One-time publish to GitHub. First create an EMPTY public repo named citadels-gate at https://github.com/new (no README),
REM then double-click this file. Needs Git for Windows (https://git-scm.com); it will ask you to sign in to GitHub the first time.
cd /d "%~dp0"
git init
git add .
git commit -m "Citadel's Gate v16: army art pass, nests, keep walls"
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/xJAYKOBIx/citadels-gate.git
git push -u origin main
echo.
echo Done. If this is the first push, go to Settings ^> Pages on GitHub, pick "Deploy from a branch", branch main, folder / (root), and the game will be served at https://xjaykobix.github.io/citadels-gate/
pause
