var LunchTrain = function() {
  this.token = PropertiesService.getScriptProperties().getProperty('SLACK_ACCESS_TOKEN')
  this.channel = PropertiesService.getScriptProperties().getProperty('SLACK_CHANNEL')
  this.usergroup = PropertiesService.getScriptProperties().getProperty('SLACK_USERGROUP_ID')
  this.sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID')
  this.sheetUrl = 'https://docs.google.com/spreadsheets/d/' + this.sheetId + '/edit'
  this.partyCount = 4
  this.skipCount = 5
}

LunchTrain.prototype = {
  go: function() {
    var members = this.getMembers()
    this.saveToSheet(members)
    this.notifyToSlack(this.buildMessage(members))
  },
  notifyFinal: function() {
    var members = this.lastMembersOnSheet()
    this.notifyToSlack(this.buildFinalMessage(members))
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
      rowIndex = rowIndex - rowCount
    } else {
      rowCount = rowIndex
      rowIndex = 1
    }
    var data = this.sheet().getSheetValues(rowIndex, columnIndex, rowCount, this.sheet().getLastColumn())
    console.log(data)
    var members = []
    for (var rowIndex = 0; rowIndex < data.length; rowIndex++) {
      var row = data[rowIndex]
      for (var colIndex = 0; colIndex < row.length; colIndex++) {
        if (row[colIndex].trim() !== '') {
          console.log([row[colIndex].trim(), this.slackNameToId(row[colIndex].trim())])
          members.push(this.slackNameToId(row[colIndex].trim()))
        }
      }
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
    for (var i = 0; i < this.partyCount; i++) {
      members.push(shuffled[i])
    }
    return members
  },
  shuffle: function(array) {
    var n = array.length, t, i
    while (n) {
      i = Math.floor(Math.random() * n--)
      t = array[n]
      array[n] = array[i]
      array[i] = t
    }
    return array
  },
  buildMessage: function(array) {
    var message = '明日、ランチ一緒に行きませんか！都合が悪ければお知らせください'
    for (var i = 0; i < array.length; i++) {
      message = message + ' <@' + array[i] + '>'
    }
    return message + "\n参加者に変更があったら、 <" + this.sheetUrl + "|管理シート> を更新してください"
  },
  buildFinalMessage: function(array) {
    var message = '今日、ランチの予定があります！都合が悪ければお知らせください'
    for (var i = 0; i < array.length; i++) {
      message = message + ' <@' + array[i] + '>'
    }
    return message + "\n参加者に変更があったら、 <" + this.sheetUrl + "|管理シート> を更新してください"
  },
  getMembersBySlack: function() {
    var opts = {
      method: 'post',
      payload: {
        token: this.token,
        usergroup: this.usergroup,
        include_disabled: 1
      }
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
          user: users[i]
        }
      }
      var res = UrlFetchApp.fetch('https://slack.com/api/users.profile.get', opts)
      var name = JSON.parse(res.getContentText()).profile.display_name
      profiles.push({ id: users[i], name: name })
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
  notifyToSlack: function(message) {
    this.client().channelsJoin(this.channel)
    var opts = {
      username: 'Lunch Train',
      icon_url: 'https://slack-files2.s3-us-west-2.amazonaws.com/avatars/2016-06-13/50545179413_3fa6b40802505106e996_72.png'
    }
    this.client().chatPostMessage(this.channel, message, opts)
  },
  isHoliday: function(date) {
    var weekInt = date.getDay()
    if (weekInt <= 0 || 6 <= weekInt){
      return true
    }
    var calendarId = 'ja.japanese#holiday@group.v.calendar.google.com'
    var calendar = CalendarApp.getCalendarById(calendarId)
    var events = calendar.getEventsForDay(date)
    return events.length > 0
  },
}

var lunchTrain = new LunchTrain()

function notifyChoseMembers() {
  var date = new Date()
  date.setDate(date.getDate() + 1)
  if (!lunchTrain.isHoliday(date)) {
    lunchTrain.go()
  }
}

function notifyFinal() {
  var date = new Date()
  if (!lunchTrain.isHoliday(date)) {
    lunchTrain.notifyFinal()
  }
}
