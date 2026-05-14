// question-history.js
// 历史回答页面逻辑
const app = getApp()
const { request } = require('../../../utils/request')
const { formatTime,formatImgUrl } = require('../../../utils/util')
const urls = require('../../../utils/api')
Page({
  data: {
    // 宠物筛选
    currentPet: null,
    petList: [],
    
    // 日期筛选
    startDate: '',
    endDate: '',
    
    // 历史回答列表
    answerList: [],
    
    // 分页参数
    pageNum: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,
    
    // 加载状态
    loading: false,
    refreshing: false,
    
    // 筛选展开状态
    showFilter: false
  },

  onLoad(options) {
    // 初始化日期范围（最近30天）
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
		const userInfo = wx.getStorageSync('userInfo')
    this.setData({
      startDate: formatTime(thirtyDaysAgo, 'yyyy-MM-dd'),
      endDate: formatTime(now, 'yyyy-MM-dd'),
			userInfo
    })
    
    this.initPage()
  },

  onShow() {
    // 每次显示时刷新数据
    this.refreshList()
  },

  // 初始化页面
  async initPage() {
    await this.getPetList()
    await this.getAnswerList()
  },

	// 获取宠物列表
	async getPetList() {
		if (!this.data.userInfo) return
		const result = await app.refreshPetList(this.data.userInfo.userId)
		if (result) {
			const petId = wx.getStorageSync('petId')
			const currentPet = result.petList.find(p => p.petId === petId) || result.petList[0]
			this.setData({
				petList: result.petList,
				currentPet: currentPet
			})
		}
	},

  // 获取历史回答列表
  async getAnswerList() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      const res = await request({
        url: urls.answerhistory,
        method: 'POST',
        data: {
          petId: this.data.currentPet?.petId || '',
          pageNum: this.data.pageNum,
          pageSize: this.data.pageSize,
          paramsBeginTime: this.data.startDate,
          paramsEndTime: this.data.endDate,
					userId: this.data.userInfo.userId
        }
      })
      if (res.code === 200) {
        let newList = res.rows || []
        // 格式化数据
        newList = newList.map(item => ({
          ...item,
          createTime: item.createTime || item.createTimeStr,
          images: formatImgUrl(item.mediaUrls)
        }))
        
        this.setData({
          answerList: this.data.pageNum === 1 ? newList : [...this.data.answerList, ...newList],
          total: res.total || 0,
          hasMore: this.data.answerList.length < (res.total || 0),
          loading: false,
          refreshing: false
        })
      } else {
        this.setData({ loading: false, refreshing: false })
      }
    } catch (err) {
      console.error('获取历史回答失败', err)
      this.setData({ loading: false, refreshing: false })
    }
  },



  // 下拉刷新
  onPullDownRefresh() {
    this.setData({
      pageNum: 1,
      refreshing: true,
      answerList: []
    })
    this.getAnswerList()
    wx.stopPullDownRefresh()
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({
        pageNum: this.data.pageNum + 1
      })
      this.getAnswerList()
    }
  },

  // 刷新列表
  refreshList() {
    this.setData({
      pageNum: 1,
      answerList: []
    })
    this.getAnswerList()
  },

  // 切换筛选展开状态
  toggleFilter() {
    this.setData({
      showFilter: !this.data.showFilter
    })
  },

  // 选择宠物
  onPetChange(e) {
    const petId = e.detail.value
    const currentPet = this.data.petList.find(p => p.id === petId)
    
    this.setData({ 
      currentPet,
      pageNum: 1,
      answerList: []
    })
    
    this.getAnswerList()
  },

  // 选择开始日期
  onStartDateChange(e) {
    this.setData({
      startDate: e.detail.value,
      pageNum: 1,
      answerList: []
    })
    this.getAnswerList()
  },

  // 选择结束日期
  onEndDateChange(e) {
    this.setData({
      endDate: e.detail.value,
      pageNum: 1,
      answerList: []
    })
    this.getAnswerList()
  },

  // 快速选择日期范围
  selectDateRange(e) {
    const type = e.currentTarget.dataset.type
    const now = new Date()
    let startDate = new Date()
    
    switch (type) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'threeMonth':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
    }
    
    this.setData({
      startDate: formatTime(startDate, 'yyyy-MM-dd'),
      endDate: formatTime(now, 'yyyy-MM-dd'),
      pageNum: 1,
      answerList: []
    })
    
    this.getAnswerList()
  },

  // 查看回答详情
  viewAnswerDetail(e) {
    const index = e.currentTarget.dataset.index
    const answer = this.data.answerList[index]
    
    wx.navigateTo({
      url: `/pages/record/daily-question/daily-question?type=answer&id=${answer.answerId}`
    })
  },

  // 预览图片
  previewImage(e) {
    const images = e.currentTarget.dataset.images
    const current = e.currentTarget.dataset.current
    
    wx.previewImage({
      current,
      urls: images
    })
  }
})
