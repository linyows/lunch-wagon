<p align="center">
<img src="https://raw.githubusercontent.com/linyows/lunch-wagon/master/misc/lunch-wagon.png" width="300"><br>
<strong>Lunch Wagon</strong> for GAS
</p>

Notify the Slack channel of the lunch members selected from the Slack user group (skipping holidays). Also, keep records on Google Sheets so that members do not overlap.

<a href="https://travis-ci.org/linyows/lunch-wagon" title="travis"><img src="https://img.shields.io/travis/linyows/lunch-wagon.svg?style=for-the-badge"></a>
<a href="https://github.com/google/clasp" title="clasp"><img src="https://img.shields.io/badge/built%20with-clasp-4285f4.svg?style=for-the-badge"></a>
<a href="https://github.com/linyows/lunch-wagon/blob/master/LICENSE" title="MIT License"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge"></a>

Usage
-----

1. Deploy this
    ```sh
    $ npm i
    $ npx clasp login
    $ npx clasp create 'Lunch Wagon' --rootDir ./src
    $ npx clasp push
    ```
1. Create google spreadsheet
    - Sheet name is `history`
1. Set script properties as ENV(File > Project properties > Script properties)
    - SLACK_ACCESS_TOKEN
    - SLACK_CHANNEL
    - SLACK_USERGROUP_ID
    - SHEET_ID
1. Add project trigger(Edit > Current project's triggers > Add trigger)
    - notifyChoseMembers
        - Choose which function to run: `notifyChoseMembers`
        - Which run at deployment: `head`
        - Select event source: `Time-driven`
        - Select type of time based trigger: `Week timer`
        - Select hour interval: `Every monday`
        - Select time of day: `10am to 11am`
    - notifyFinal
        - Choose which function to run: `notifyFinal`
        - Which run at deployment: `head`
        - Select event source: `Time-driven`
        - Select type of time based trigger: `Week timer`
        - Select hour interval: `Every Tuesday`
        - Select time of day: `9am to 10am`

Contribution
------------

1. Fork (https://github.com/linyows/lunch-wagon/fork)
1. Create a feature branch
1. Commit your changes
1. Rebase your local changes against the master branch
1. Run test suite with the `npm ci` command and confirm that it passes
1. Create a new Pull Request

Author
------

[linyows](https://github.com/linyows)
