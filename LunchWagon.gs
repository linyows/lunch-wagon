/**
 * Lunch Wagon
 * notify slack channel for lunch members from slack usergroup random selects.
 *
 * Copyright (c) 2018 Tomohisa Oda
 */

var LunchWagon = function() {
  this.token = PropertiesService.getScriptProperties().getProperty('SLACK_ACCESS_TOKEN')
  this.channel = PropertiesService.getScriptProperties().getProperty('SLACK_CHANNEL')
  this.usergroup = PropertiesService.getScriptProperties().getProperty('SLACK_USERGROUP_ID')
  this.sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID')
  this.sheetUrl = 'https://docs.google.com/spreadsheets/d/' + this.sheetId + '/edit'
  this.partyCount = 4
  this.skipCount = 5
  this.membersNotGo = []
  this.membersMustGo = []
}

LunchWagon.prototype = {
  go: function() {
    var members = this.getMembers()
    this.saveToSheet(members)
    var attachments = [{
      title: 'ランダムにメンバーを選んでランチへ行く通知です',
      title_link: 'https://github.com/linyows/lunch-wagon.gs',
      color: '#ffc844',
      text: '行ける or 行けない をスレッドやリアクション絵文字などでお知らせください。'
          + '参加者に変更があったら、 <' + this.sheetUrl + '|管理シート> を更新してください'
    }]
    if (this.membersMustGo.length > 0) {
      attachments[0]['fields'] = [{
        title: 'ヘビロテ メンバー :fire:',
        value: this.membersMustGo.join(', ')
      }]
    }
    this.notifyToSlack(this.buildMessage(members), JSON.stringify(attachments))
  },
  notifyFinal: function() {
    var members = this.lastMembersOnSheet()
    if (members.length === 0) {
      return
    }
    var attachments = [{
      title: 'ランダムにメンバーを選んでランチへ行く通知です',
      title_link: 'https://github.com/linyows/lunch-wagon.gs',
      color: '#ffc844',
      text: '参加者に変更があったら、 <' + this.sheetUrl + '|管理シート> を更新してください'
    }]
    this.notifyToSlack(this.buildFinalMessage(members), JSON.stringify(attachments))
  },
  slackMembers: function() {
    if (this.slackMembers_ === undefined) {
      this.slackMembers_ = this.client().usersList().members
    }
    return this.slackMembers_
  },
  slackIdToName: function(id) {
    var m = this.slackMembers()
    for (var i = 0; i < m.length; i++) {
      if (m[i].id === id) {
        return m[i].name
      }
    }
    return null
  },
  slackNameToId: function(name) {
    var m = this.slackMembers()
    for (var i = 0; i < m.length; i++) {
      if (m[i].name === name) {
        return m[i].id
      }
    }
    return null
  },
  lastMembersOnSheet: function() {
    var columnIndex = 2
    var rowIndex = this.sheet().getLastRow()
    var rowCount = 1
    var data = this.sheet().getSheetValues(rowIndex, columnIndex, rowCount, this.partyCount)
    var members = []
    for (var rowIndex = 0; rowIndex < data.length; rowIndex++) {
      var row = data[rowIndex]
      for (var colIndex = 0; colIndex < row.length; colIndex++) {
        if (row[colIndex].trim() !== '') {
          members.push(this.slackNameToId(row[colIndex].trim()))
        }
      }
    }
    return members
  },
  excludedMembers: function() {
    var columnIndex = 2
    var rowIndex = this.sheet().getLastRow()
    var rowCount = this.skipCount
    if (rowIndex > rowCount) {
      // this increment for start
      rowIndex = rowIndex - rowCount + 1
    } else {
      rowCount = rowIndex
      rowIndex = 1
    }
    var data = this.sheet().getSheetValues(rowIndex, columnIndex, rowCount, this.sheet().getLastColumn())

    var members = []
    for (var rowIndex = 0; rowIndex < data.length; rowIndex++) {
      var row = data[rowIndex]
      for (var colIndex = 0; colIndex < row.length; colIndex++) {
        if (row[colIndex].trim() !== '') {
          members.push(this.slackNameToId(row[colIndex].trim()))
        }
      }
    }

    for (var noGoIndex = 0; noGoIndex < this.membersNotGo.length; noGoIndex++) {
      members.push(this.slackNameToId(this.membersNotGo[noGoIndex]))
    }

    for (var mustGoIndex = 0; mustGoIndex < this.membersMustGo.length; mustGoIndex++) {
      members.push(this.slackNameToId(this.membersMustGo[mustGoIndex]))
    }

    return members
  },
  availableMembers: function() {
    var fullMembers = this.getMembersBySlack()
    var excludedMembers = this.excludedMembers()
    var members = []
    for (var i = 0; i < fullMembers.length; i++) {
      if (excludedMembers.indexOf(fullMembers[i]) === -1) {
        members.push(fullMembers[i])
      }
    }

    return members
  },
  getMembers: function() {
    var shuffled = this.shuffle(this.availableMembers())
    var members = []
    var partyCount = this.partyCount - this.membersMustGo.lenght

    for (var mustGoIndex = 0; mustGoIndex < this.membersMustGo.length; mustGoIndex++) {
      members.push(this.slackNameToId(this.membersMustGo[mustGoIndex]))
    }

    for (var i = 0; i < partyCount; i++) {
      members.push(shuffled[i])
    }

    return members
  },
  shuffle: function(array) {
    var n = array.length
    while (n) {
      var i = Math.floor(Math.random() * n--)
      var t = array[n]
      array[n] = array[i]
      array[i] = t
    }
    return array
  },
  buildMessage: function(array) {
    var message = '明日、ランチ一緒に行きませんか！'
    for (var i = 0; i < array.length; i++) {
      message = message + ' <@' + array[i] + '>'
    }
    return message
  },
  buildFinalMessage: function(array) {
    var message = '今日、ランチの予定があります！'
    for (var i = 0; i < array.length; i++) {
      message = message + ' <@' + array[i] + '>'
    }
    return message
  },
  getMembersBySlack: function() {
    var opts = {
      method: 'post',
      payload: {
        token: this.token,
        usergroup: this.usergroup,
        include_disabled: 1,
      },
    }
    var res = UrlFetchApp.fetch('https://slack.com/api/usergroups.users.list', opts)
    return JSON.parse(res.getContentText()).users
  },
  saveToSheet: function(members) {
    var date = new Date()
    date.setDate(date.getDate() + 1)
    var today = Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd')
    var data = []
    for (var i = 0; i < members.length; i++) {
      data.push(this.slackIdToName(members[i]))
    }
    data.unshift(today)
    this.sheet().appendRow(data)
  },
  getProfiles: function(users) {
    var profiles = []
    for (var i = 0; i < users.length; i++) {
      var opts = {
        method: 'post',
        payload: {
          token: this.token,
          user: users[i],
        },
      }
      var res = UrlFetchApp.fetch('https://slack.com/api/users.profile.get', opts)
      var name = JSON.parse(res.getContentText()).profile.display_name
      profiles.push({id: users[i], name: name})
    }
    return profiles
  },
  sheet: function() {
    if (this.sss === undefined) {
      var ss = SpreadsheetApp.openById(this.sheetId)
      this.sss = ss.getSheetByName('history')
    }
    return this.sss
  },
  client: function() {
    if (this.slack === undefined) {
      this.slack = SlackApp.create(this.token)
    }
    return this.slack
  },
  notifyToSlack: function(message, attachments) {
    this.client().channelsJoin(this.channel)
    var opts = {
      username: 'Lunch Wagon',
      icon_url: 'https://raw.githubusercontent.com/linyows/lunch-wagon.gs/master/misc/icon.png',
    }
    if (attachments) {
      opts.attachments = attachments
    }
    this.client().chatPostMessage(this.channel, message, opts)
  },
  isHoliday: function(date) {
    var weekInt = date.getDay()
    if (weekInt <= 0 || 6 <= weekInt) {
      return true
    }
    var calendarId = 'ja.japanese#holiday@group.v.calendar.google.com'
    var calendar = CalendarApp.getCalendarById(calendarId)
    var events = calendar.getEventsForDay(date)
    return events.length > 0
  },
}

var lunchWagon = new LunchWagon()

/**
 * notifyChoseMembers notify chose members to slack before a day
 */
function notifyChoseMembers() {
  var date = new Date()
  date.setDate(date.getDate() + 1)
  if (!lunchWagon.isHoliday(date)) {
    lunchWagon.go()
  }
}

/**
 * notifyFinal notify chose members to slack at today morning
 */
function notifyFinal() {
  var date = new Date()
  if (!lunchWagon.isHoliday(date)) {
    lunchWagon.notifyFinal()
  }
}
