/**
 * Lunch Wagon
 * notify slack channel for lunch members from slack usergroup random selects.
 *
 * Copyright (c) 2018 Tomohisa Oda
 */

interface ISlackMember {
  id: string
  name: string
}

interface ISlackField {
  title: string
  value: string
}

interface ISlackAttachment {
  title: string
  title_link: string
  color: string
  text: string
  fields?: ISlackField[]
}

interface ISlackPostMessageOpts {
  username: string
  icon_url: string
  text: string
  attachments?: string
}

/**
 * Slack Client
 */
class Slack {
  private token: string

  constructor(token: string) {
    this.token = token
  }

  public usergroupMembers(usergroup: string): string[] {
    const res = UrlFetchApp.fetch('https://slack.com/api/usergroups.users.list', {
      method: 'post',
      payload: {
        token: this.token,
        usergroup: usergroup,
        include_disabled: 1
      }
    })

    return JSON.parse(res.getContentText()).users
  }

  public userProfiles(users: string[]): object[] {
    const profiles = []

    for (const user of users) {
      const res = UrlFetchApp.fetch('https://slack.com/api/users.profile.get', {
        method: 'post',
        payload: {
          token: this.token,
          user: user
        }
      })
      const name = JSON.parse(res.getContentText()).profile.display_name
      profiles.push({id: user, name: name})
    }

    return profiles
  }

  public joinChannel(channel: string): boolean {
    const res = UrlFetchApp.fetch('https://slack.com/api/channels.join', {
      method: 'post',
      payload: {
        token: this.token,
        name: channel
      }
    })

    return JSON.parse(res.getContentText()).ok
  }

  public postMessage(channel: string, opts: ISlackPostMessageOpts) {
    this.joinChannel(channel)

    const res = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
      method: 'post',
      payload: { ...{ token: this.token, channel: channel }, ...opts }
    })

    return JSON.parse(res.getContentText()).ok
  }

  private members(): ISlackMember[] {
    const res = UrlFetchApp.fetch('https://slack.com/api/users.list', {
      method: 'get',
      payload: {
        token: this.token
      }
    })

    return JSON.parse(res.getContentText()).members
  }
}

interface ISlackConfig {
  token: string
  channel: string
  usergroup: string
  username: string
  icon_url: string
  attachment?: ISlackAttachment
}

interface ISpreadsheetsConfig {
  id: string
  url: string
}

interface ISingleChannelUser {
  username: string
  channel: string
}

interface IConfig {
  slack: ISlackConfig
  spreadsheets: ISpreadsheetsConfig
  partyCount: number
  skipCount: number
  membersMustGo: string[]
  membersNotGo: string[]
  singleChannelUsers: ISingleChannelUser[]
}

/**
 * LunchWagon
 */
class LunchWagon {

  private get slack(): any {
    if (this.pSlack === undefined) {
      this.pSlack = new Slack(this.config.slack.token)
    }

    return this.pSlack
  }

  private get sheet(): any {
    if (this.pSheet === undefined) {
      const s = SpreadsheetApp.openById(this.config.spreadsheets.id)
      this.pSheet = s.getSheetByName('history')
    }

    return this.pSheet
  }

  public config: IConfig
  private pSlackMembers: ISlackMember[]
  private pSheet: any
  private pSlack: any

  constructor(c: IConfig) {
    this.config = c
  }

  public static IS_HOLIDAY(date: Date): boolean {
    const startWeek = 0
    const endWeek = 6
    const weekInt = date.getDay()
    if (weekInt <= startWeek || endWeek <= weekInt) {
      return true
    }
    const calendarId = 'ja.japanese#holiday@group.v.calendar.google.com'
    const calendar = CalendarApp.getCalendarById(calendarId)
    const events = calendar.getEventsForDay(date)

    return events.length > 0
  }

  private static shuffle(array: string[]): string[] {
    let n = array.length

    while (n) {
      n -= 1
      const i = Math.floor(Math.random() * n)
      const t = array[n]
      array[n] = array[i]
      array[i] = t
    }

    return array
  }

  private static buildMessage(text: string, members: string[]): string {
    let message = text

    for (const member of members) {
      message = `${message} <@${member}>`
    }

    return message
  }

  public go(): void {
    const members = this.members()
    this.saveToSheet(members)
    const attachments = [this.config.slack.attachment]

    if (this.config.membersMustGo.length > 0) {
      attachments[0]['fields'] = [{
        title: 'ヘビロテ メンバー :fire:',
        value: this.config.membersMustGo.join(', ')
      }]
    }

    const opts = {
      username: this.config.slack.username,
      icon_url: this.config.slack.icon_url,
      text: LunchWagon.buildMessage('明日、ランチ一緒に行きませんか！', members),
      attachments: JSON.stringify(attachments)
    }

    this.slack.postMessage(this.config.slack.channel, opts)

    if (this.config.singleChannelUsers.length > 0) {
      const channels: string[] = []
      const users = this.config.singleChannelUsers
      for (const user of users) {
        if (members.indexOf(this.slackNameToId(user.username)) !== -1 &&
            channels.indexOf(user.channel) === -1) {
          channels.push(user.channel)
          this.slack.postMessage(user.channel, opts)
        }
      }
    }
  }

  public notifyFinal(): void {
    const members = this.lastMembersOnSheet()

    if (members.length === 0) {
      return
    }

    const opts = {
      username: this.config.slack.username,
      icon_url: this.config.slack.icon_url,
      text: LunchWagon.buildMessage('今日、ランチの予定があります！', members),
      attachments: JSON.stringify([this.config.slack.attachment])
    }

    this.slack.postMessage(this.config.slack.channel, opts)

    if (this.config.singleChannelUsers.length > 0) {
      const channels: string[] = []
      const users = this.config.singleChannelUsers
      for (const user of users) {
        if (members.indexOf(this.slackNameToId(user.username)) !== -1 &&
            channels.indexOf(user.channel) === -1) {
          channels.push(user.channel)
          this.slack.postMessage(user.channel, opts)
        }
      }
    }
  }

  private slackMembers(): ISlackMember[] {
    if (this.pSlackMembers === undefined) {
      this.pSlackMembers = this.slack.members()
    }

    return this.pSlackMembers
  }

  private slackIdToName(id: string): string {
    const members = this.slackMembers()

    for (const member of members) {
      if (member.id === id) {
        return member.name
      }
    }

    return ''
  }

  private slackNameToId(name: string): string {
    const members = this.slackMembers()

    for (const member of members) {
      if (member.name === name) {
        return member.id
      }
    }

    return ''
  }

  private lastMembersOnSheet(): string[] {
    const columnIndex = 2
    const rowIndex = this.sheet.getLastRow()
    const rowCount = 1
    const data = this.sheet.getSheetValues(rowIndex, columnIndex, rowCount, this.config.partyCount)
    const members = []

    for (const row of data) {
      for (const col of row) {
        if (col.trim() !== '') {
          members.push(this.slackNameToId(col.trim()))
        }
      }
    }

    return members
  }

  private excludedMembers(): string[] {
    const columnIndex = 2
    let rowIndex = this.sheet.getLastRow()
    let rowCount = this.config.skipCount
    if (rowIndex > rowCount) {
      // this increment for start
      rowIndex = rowIndex - rowCount + 1
    } else {
      rowCount = rowIndex
      rowIndex = 1
    }

    const data = this.sheet.getSheetValues(rowIndex, columnIndex, rowCount, this.sheet.getLastColumn())

    const members = []
    for (const row of data) {
      for (const col of row) {
        if (col.trim() !== '') {
          members.push(this.slackNameToId(col.trim()))
        }
      }
    }

    for (const notGo of this.config.membersNotGo) {
      members.push(this.slackNameToId(notGo))
    }

    for (const mustGo of this.config.membersMustGo) {
      members.push(this.slackNameToId(mustGo))
    }

    return members
  }

  private availableMembers(): string[] {
    const fullMembers = this.slack.usergroupMembers(this.config.slack.usergroup)

    const users = this.config.singleChannelUsers
    if (users.length > 0) {
      for (const user of users) {
        const id = this.slackNameToId(user.username)
        if (id !== '') {
          fullMembers.push(id)
        }
      }
    }

    const excludedMembers = this.excludedMembers()
    const members = []

    for (const member of fullMembers) {
      if (excludedMembers.indexOf(member) === -1) {
        members.push(member)
      }
    }

    return members
  }

  private members(): string[] {
    const shuffled = LunchWagon.shuffle(this.availableMembers())

    const members = []
    const partyCount = this.config.partyCount - this.config.membersMustGo.length

    for (let i = 0; i < partyCount; i += 1) {
      members.push(shuffled[i])
    }

    for (const mustGo of this.config.membersMustGo) {
      members.push(this.slackNameToId(mustGo))
    }

    return members
  }

  private saveToSheet(members: string[]): void {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    const today = Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd')
    const data = []

    for (const member of members) {
      data.push(this.slackIdToName(member))
    }

    data.unshift(today)
    this.sheet.appendRow(data)
  }
}

/**
 * Main
 */
const sheetId = PropertiesService
  .getScriptProperties()
  .getProperty('SHEET_ID')
const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`

const wagon = new LunchWagon({
  slack: {
    token: PropertiesService
      .getScriptProperties()
      .getProperty('SLACK_ACCESS_TOKEN'),
    channel: PropertiesService
      .getScriptProperties()
      .getProperty('SLACK_CHANNEL'),
    usergroup: PropertiesService
      .getScriptProperties()
      .getProperty('SLACK_USERGROUP_ID'),
    icon_url: 'https://raw.githubusercontent.com/linyows/lunch-wagon.gs/master/misc/icon.png',
    username: 'Lunch Wagon',
    attachment: {
      title: 'ランダムにメンバーを選んでランチへ行く通知です',
      title_link: 'https://github.com/linyows/lunch-wagon.gs',
      color: '#ffc844',
      text: '行ける or 行けない をスレッドやリアクション絵文字などでお知らせください。'
          + `参加者に変更があったら、 <${sheetUrl}|管理シート> を更新してください。:pray:`
    }
  },
  spreadsheets: {
    id: sheetId,
    url: sheetUrl
  },
  partyCount: 4,
  skipCount: 5,
  membersNotGo: [],
  membersMustGo: [],
  singleChannelUsers: []
  //singleChannelUsers: [{ username: '', channel: '' }],
})

/**
 * notifyChoseMembers notify chose members to slack before a day
 */
function notifyChoseMembers() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  if (!LunchWagon.IS_HOLIDAY(date)) {
    wagon.go()
  }
}

/**
 * notifyFinal notify chose members to slack at today morning
 */
function notifyFinal() {
  const date = new Date()
  if (!LunchWagon.IS_HOLIDAY(date)) {
    wagon.notifyFinal()
  }
}
