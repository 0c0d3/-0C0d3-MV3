======================================================================================
0c0d3 Ad-Blocker – BASIC INSTRUCTIONS
========================================================================================

1. REQUIREMENTS
--------------------------------------------------------------------------------
- Node.js (version 18 or higher)
Download from: https://nodejs.org/

2. INSTALLING DEPENDENCIES
--------------------------------------------------------------------------------
Open a terminal In the folder where build.js is located, run:

npm install axios sharp archiver @adguard/agtree

3. GENERATE THE EXTENSION
--------------------------------------------------------------------------------
Run the following command in the terminal:

node build.js

This will create:
- An "extension/" folder containing all the extension files.

- A "0c0d3.xpi" file (for Firefox).