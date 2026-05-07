// pages/reminder/detail/detail.js
const app = getApp()
const {
	request
} = require('../../../utils/request')
const {
	formatTime,
	ShowImgUrl,
	calculatePetAgeFormat
} = require('../../../utils/util')
const urls = require('../../../utils/api')
Page({
  data: {
    // 提醒ID
    reminderId: '',
    
    // 提醒详情
    detail: {
      id: '',
      title: '',
      description: '',
      category: '',
      petId: '',
      petName: '',
      remindDate: '',
      remindTime: '',
      repeatType: '',
      isCompleted: false,
      completedDate: '',
      isOverdue: false
    },
    
    // 删除弹窗
    showDeleteModal: false,
    
    // 加载状态
    isLoading: false
  },

  onLoad(options) {
    const { id } = options
    if (id) {
      this.setData({ reminderId: id })
      this.loadDetail(id)
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
      wx.navigateBack()
    }
  },

  onShow() {
    // 每次显示时刷新数据
    if (this.data.reminderId) {
      this.loadDetail(this.data.reminderId)
    }
  },

  // 加载详情
  async loadDetail(id) {
    this.setData({ isLoading: true })
    
    try {
      const res = await request({
        url: urls.reminder+`/${id}`,
        method: 'GET',
        showLoading: true,
        loadingText: '加载中...'
      })
      
      if (res.code === 200) {
        const detail = res.data || {}
        // 处理数据
        detail.isOverdue = this.checkIsOverdue(detail)
				detail.categoryText=  this.getCategoryText(detail.reminderType)
				detail.categoryIcon=  this.getCategoryIcon(detail.reminderType)
				detail.repeatText=  this.getRepeatText(detail.repeatType)
				detail.StatusText=this.getStatusText(detail)
        this.setData({ detail })
      } else {
        wx.showToast({
          title: res.msg || '加载失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('加载详情失败', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 检查是否逾期
  checkIsOverdue(item) {
    if (item.isCompleted) return false
    
    const now = new Date()
    const remindDate = new Date(item.remindDate)
    const remindTime = item.remindTime || '00:00'
    const [hours, minutes] = remindTime.split(':').map(Number)
    remindDate.setHours(hours, minutes, 0, 0)
    
    return now > remindDate
  },

  // 获取分类图标
  getCategoryIcon(category) {
    const icons = {
      1: '💉',
      2: '🩺',
      3: '💊',
      4: '📌'
    }
    return icons[category] || '📌'
  },

  // 获取分类文本
  getCategoryText(category) {
    const texts = {
      1: '疫苗',
      2: '体检',
      3: '用药',
      4: '其他'
    }
    return texts[category] || '其他'
  },

  // 获取状态文本
  getStatusText(detail) {
    if (detail.isCompleted==1) {
      return '已完成'
    }
    if (detail.isOverdue) {
      return '已逾期'
    }
    return '待完成'
  },

  // 获取重复类型文本
  getRepeatText(repeatType) {
    const texts = {
      '0': '不重复',
      '1': '每天',
      '2': '每周',
      '3': '每月',
      '4': '每年'
    }
    return texts[repeatType] || '不重复'
  },

  // 编辑
  onEdit() {
    wx.navigateTo({
      url: `/pages/reminder/edit/edit?id=${this.data.reminderId}`
    })
  },

  // 切换完成状态
  async onToggleComplete() {
    const { detail } = this.data
    const operation = detail.isCompleted ? '/undo' : '/complete'
    
    try {
      const res = await request({
        url: urls.reminder+operation,
        method: 'GET',
				data: {
          reminderId: detail.reminderId,
        },
        showLoading: true,
        loadingText: detail.isCompleted ? '取消中...' : '完成中...'
      })
      
      if (res.code === 200) {
        wx.showToast({
          title: detail.isCompleted ? '已取消完成' : '已完成',
          icon: 'success'
        })
        
        // 重新加载详情
        this.loadDetail(this.data.reminderId)
      } else {
        wx.showToast({
          title: res.msg || '操作失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('操作失败', err)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 显示删除弹窗
  onDelete() {
    this.setData({ showDeleteModal: true })
  },

  // 隐藏删除弹窗
  hideDeleteModal() {
    this.setData({ showDeleteModal: false })
  },

  // 阻止事件冒泡
  stopPropagation() {},

  // 确认删除
  async confirmDelete() {
    this.setData({ showDeleteModal: false })
    
    try {
      const res = await request({
        url: urls.reminder+`/remove/${this.data.reminderId}`,
        method: 'DELETE',
        showLoading: true,
        loadingText: '删除中...'
      })
      
      if (res.code === 200) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        })
        
        // 延迟返回列表页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: res.msg || '删除失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('删除失败', err)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  }
})
