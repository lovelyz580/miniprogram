// pages/reminder/index.js
const app = getApp()
const { request } = require('../../utils/request')
const { formatTime } = require('../../utils/util')

Page({
  data: {
    // 筛选
    currentCategory: 'all',
    
    // 提醒列表
    pendingList: [],
    completedList: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    isLoading: false,
    isRefreshing: false,
    
    // 显示已完成
    showCompleted: false
  },

  onLoad() {
    this.initPage()
  },

  onShow() {
    this.refreshData()
  },

  onPullDownRefresh() {
    this.refreshData().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 初始化页面
  async initPage() {
    try {
      await this.getReminders()
    } catch (err) {
      console.error('初始化失败', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 刷新数据
  async refreshData() {
    this.setData({ isLoading: true })
    try {
      await this.getReminders(true)
    } catch (err) {
      console.error('刷新数据失败', err)
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 获取提醒列表
  async getReminders(refresh = false) {
    const { currentCategory, page, pageSize } = this.data
    
    if (refresh) {
      this.setData({ page: 1, isRefreshing: true })
    }
    
    try {
      const res = await request({
        url: '/api/reminder/list',
        method: 'GET',
        data: {
          category: currentCategory === 'all' ? '' : currentCategory,
          page,
          pageSize
        }
      })
      
      if (res.code === 0) {
        const allReminders = (res.data.records || []).map(item => ({
          ...item,
          categoryText: this.getCategoryText(item.category),
          isOverdue: this.checkIsOverdue(item),
          repeatText: this.getRepeatText(item.repeatType)
        }))
        
        const pendingList = allReminders.filter(r => !r.isCompleted)
        const completedList = allReminders.filter(r => r.isCompleted)
        
        this.setData({
          pendingList: refresh ? pendingList : [...this.data.pendingList, ...pendingList],
          completedList: refresh ? completedList : [...this.data.completedList, ...completedList],
          hasMore: allReminders.length === pageSize,
          page: page + 1,
          isRefreshing: false
        })
      }
    } catch (err) {
      console.error('获取提醒列表失败', err)
      this.setData({ isRefreshing: false })
    }
  },

  // 获取分类文本
  getCategoryText(category) {
    const categoryMap = {
      'vaccine': '💉疫苗',
      'checkup': '🩺体检',
      'medication': '💊用药',
      'other': '📌其他'
    }
    return categoryMap[category] || '📌其他'
  },

  // 检查是否逾期
  checkIsOverdue(item) {
    if (item.isCompleted) return false
    if (!item.remindDate) return false
    
    const remindDate = new Date(item.remindDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    remindDate.setHours(0, 0, 0, 0)
    
    return remindDate < today
  },

  // 获取重复文本
  getRepeatText(repeatType) {
    const repeatMap = {
      'none': '',
      'daily': '每天',
      'weekly': '每周',
      'monthly': '每月',
      'yearly': '每年'
    }
    return repeatMap[repeatType] || ''
  },

  // 切换分类
  switchCategory(e) {
    const category = e.currentTarget.dataset.category
    if (category === this.data.currentCategory) return
    
    this.setData({ currentCategory: category })
    this.refreshData()
  },

  // 切换显示已完成
  toggleCompleted() {
    this.setData({ showCompleted: !this.data.showCompleted })
  },

  // 下拉刷新
  onRefresh() {
    this.refreshData()
  },

  // 加载更多
  loadMore() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.getReminders()
    }
  },

  // 显示详情
  showDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/reminder/detail?id=${id}`
    })
  },

  // 切换完成状态
  async toggleComplete(e) {
    const { id } = e.currentTarget.dataset
    const item = [...this.data.pendingList, ...this.data.completedList].find(r => r.id === id)
    
    if (!item) return
    
    try {
      if (item.isCompleted) {
        // 取消完成
        await request({
          url: `/api/reminder/${id}/undo`,
          method: 'POST'
        })
      } else {
        // 标记完成
        await request({
          url: `/api/reminder/${id}/complete`,
          method: 'POST',
          data: { completedDate: formatTime(new Date(), 'yyyy-MM-dd') }
        })
      }
      
      wx.showToast({
        title: item.isCompleted ? '已取消' : '已完成',
        icon: 'success'
      })
      
      this.refreshData()
    } catch (err) {
      console.error('更新状态失败', err)
    }
  },

  // 编辑提醒
  editReminder(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/reminder/edit?id=${id}`
    })
  },

  // 删除提醒
  deleteReminder(e) {
    const { id } = e.currentTarget.dataset
    
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await request({
              url: `/api/reminder/${id}`,
              method: 'DELETE'
            })
            
            if (result.code === 0) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
              this.refreshData()
            }
          } catch (err) {
            console.error('删除提醒失败', err)
          }
        }
      }
    })
  },

  // 跳转添加页面
  goToAdd() {
    wx.navigateTo({
      url: '/pages/reminder/add'
    })
  }
})
