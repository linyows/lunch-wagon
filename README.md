<p align="center">
<img src="https://raw.githubusercontent.com/linyows/lunch-wagon.gs/master/misc/lunch-wagon.png" width="300"><br>
<strong>Lunch Wagon</strong> for GAS
</p>

Notify the Slack channel of the lunch members selected from the Slack user group (skipping holidays). Also, keep records on Google Sheets so that members do not overlap.

<a href="https://travis-ci.org/linyows/lunch-wagon.gs" title="travis"><img src="https://img.shields.io/travis/linyows/lunch-wagon.gs.svg?style=for-the-badge"></a>
<a href="https://github.com/google/clasp" title="clasp"><img src="https://img.shields.io/badge/built%20with-clasp-4285f4.svg?style=for-the-badge"></a>
<a href="https://github.com/linyows/lunch-wagon.gs/blob/master/LICENSE" title="MIT License"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge"></a>

Usage
-----

[![Greenkeeper badge](https://badges.greenkeeper.io/linyows/lunch-wagon.svg)](https://greenkeeper.io/)

1. Deploy this
    ```sh
    $ npm i
    $ npx clasp login
    $ npx clasp create 'Lunch Wagon' --rootDir ./src
    $ npx clasp push
    ```
1. Create google spreadsheet
1. Set environments
    - SLACK_ACCESS_TOKEN
    - SLACK_CHANNEL
    - SLACK_USERGROUP_ID
    - SHEET_ID
1. Add triger
   ![trigger](https://raw.githubusercontent.com/linyows/lunch-wagon.gs/master/misc/trigger.png)


### Functions

- notifyChoseMembers
- notifyFinal

Contribution
------------

1. Fork (https://github.com/linyows/lunch-wagon.gs/fork)
1. Create a feature branch
1. Commit your changes
1. Rebase your local changes against the master branch
1. Run test suite with the `npm ci` command and confirm that it passes
1. Create a new Pull Request

Author
------

[linyows](https://github.com/linyows)
