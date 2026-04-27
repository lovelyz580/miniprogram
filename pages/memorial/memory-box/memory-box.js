// memory-box.js
const app = getApp()
const { request } = require('../../../utils/request')
const { formatTime } = require('../../../utils/util')

Page({
  data: {
    // 分类列表
    categories: [
      { value: 'hair', name: '毛发', icon: '🧶' },
      { value: 'pawprint', name: '爪印', icon: '🐾' },
      { value: 'collar', name: '项圈', icon: '🔔' },
      { value: 'toy', name: '玩具', icon: '🎾' },
      { value: 'clothes', name: '衣服', icon: '👔' },
      { value: 'medicine', name: '药品', icon: '💊' },
      { value: 'certificate', name: '证件', icon: '📄' },
      { value: 'other', name: '其他', icon: '📦' }
    ],
    
    // 选中分类
    selectedCategory: 'all',
    
    // 纪念品列表
    items: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    isLoading: false,
    
    // 统计
    totalCount: 0,
    categoryCount: 0,
    
    // 弹窗控制
    showAddModal: false,
    showDatePickerModal: false,
    isEditing: false,
    editingId: '',
    
    // 表单数据
    formData: {
      name: '',
      category: '',
      photoUrl: '',
      description: '',
      location: '',
      obtainDate: ''
    },
    
    // 日期选择器
    years: [],
    months: [],
    days: [],
    datePickerValue: [0, 0, 0]
  },

  onLoad() {
    this.initDatePicker()
    this.getItems()
    this.getStatistics()
  },

  // 初始化日期选择器
  initDatePicker() {
    const now = new Date()
    const years = []
    const months = []
    const days = []

    for (let i = now.getFullYear() - 20; i <= now.getFullYear(); i++) {
      years.push(i)
    }

    for (let i = 1; i <= 12; i++) {
      months.push(i)
    }

    for (let i = 1; i <= 31; i++) {
      days.push(i)
    }

    this.setData({
      years,
      months,
      days,
      datePickerValue: [20, now.getMonth(), now.getDate() - 1]
    })
  },

  // 获取纪念品列表
  async getItems() {
    if (this.data.isLoading) return
    
    try {
      this.setData({ isLoading: true })
      
      const params = {
        page: this.data.page,
        pageSize: this.data.pageSize
      }
      
      if (this.data.selectedCategory !== 'all') {
        params.category = this.data.selectedCategory
      }
      
      const res = await request({
        url: '/api/memorial/memory-box/list',
        method: 'GET',
        data: params
      })
      
      if (res.code === 0) {
        const items = (res.data.list || []).map(item => ({
          ...item,
          categoryName: this.getCategoryName(item.category)
        }))
        
        this.setData({
          items: this.data.page === 1 ? items : [...this.data.items, ...items],
          hasMore: items.length >= this.data.pageSize,
          isLoading: false
        })
      } else {
        this.setData({ isLoading: false })
      }
    } catch (err) {
      console.error('获取纪念品列表失败', err)
      this.setData({ isLoading: false })
    }
  },

  // 获取分类名称
  getCategoryName(value) {
    const category = this.data.categories.find(c => c.value === value)
    return category ? category.name : '其他'
  },

  // 获取分类图标
  getCategoryIcon(value) {
    const category = this.data.categories.find(c => c.value === value)
    return category ? category.icon : '📦'
  },

  // 获取统计数据
  async getStatistics() {
    try {
      const res = await request({
        url: '/api/memorial/memory-box/stats',
        method: 'GET'
      })
      
      if (res.code === 0) {
        this.setData({
          totalCount: res.data.totalCount || 0,
          categoryCount: res.data.categoryCount || 0
        })
      }
    } catch (err) {
      console.error('获取统计数据失败', err)
    }
  },

  // 选择分类
  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    if (category === this.data.selectedCategory) return
    
    this.setData({
      selectedCategory: category,
      page: 1,
      items: []
    })
    this.getItems()
  },

  // 加载更多
  loadMore() {
    if (!this.data.hasMore || this.data.isLoading) return
    
    this.setData({
      page: this.data.page + 1
    })
    this.getItems()
  },

  // 跳转详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/memorial/memory-detail/memory-detail?id=${id}`
    })
  },

  // 显示添加选项
  showAddOptions() {
    this.setData({
      showAddModal: true,
      isEditing: false,
      editingId: '',
      formData: {
        name: '',
        category: '',
        photoUrl: '',
        description: '',
        location: '',
        obtainDate: ''
      }
    })
  },

  hideAddModal() {
    this.setData({
      showAddModal: false
    })
  },

  // 编辑纪念品
  onEdit(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.items.find(i => i.id === id)
    
    if (item) {
      this.setData({
        showAddModal: true,
        isEditing: true,
        editingId: id,
        formData: {
          name: item.name,
          category: item.category,
          photoUrl: item.photoUrl || '',
          description: item.description || '',
          location: item.location || '',
          obtainDate: item.obtainDate || ''
        }
      })
    }
  },

  // 删除纪念品
  onDelete(e) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这份纪念品吗？删除后无法恢复。',
      confirmColor: '#FF4D4F',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await request({
              url: `/api/memorial/memory-box/${id}`,
              method: 'DELETE'
            })
            
            if (result.code === 0) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
              
              this.setData({
                page: 1,
                items: []
              })
              this.getItems()
              this.getStatistics()
            }
          } catch (err) {
            console.error('删除失败', err)
          }
        }
      }
    })
  },

  // 表单输入
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    })
  },

  onDescInput(e) {
    this.setData({
      'formData.description': e.detail.value
    })
  },

  onLocationInput(e) {
    this.setData({
      'formData.location': e.detail.value
    })
  },

  // 选择表单分类
  selectFormCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      'formData.category': this.data.formData.category === category ? '' : category
    })
  },

  // 选择照片
  choosePhoto() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        wx.showLoading({ title: '上传中...' })
        
        try {
          const uploadRes = await wx.uploadFile({
            url:  + '/api/upload',
            filePath: res.tempFilePaths[0],
            name: 'file',
            header: {
              'Authorization': wx.getStorageSync('token') || ''
            }
          })
          
          const result = JSON.parse(uploadRes.data)
          
          if (result.code === 0) {
            this.setData({
              'formData.photoUrl': result.data.url
            })
          }
          
          wx.hideLoading()
        } catch (err) {
          console.error('上传失败', err)
          this.setData({
            'formData.photoUrl': res.tempFilePaths[0]
          })
          wx.hideLoading()
        }
      }
    })
  },

  // 显示日期选择器
  showDatePicker() {
    this.setData({
      showDatePickerModal: true
    })
  },

  hideDatePicker() {
    this.setData({
      showDatePickerModal: false
    })
  },

  onDateChange(e) {
    const value = e.detail.value
    const year = this.data.years[value[0]]
    const month = this.data.months[value[1]]
    const day = this.data.days[value[2]]
    
    this.setData({
      'formData.obtainDate': `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    })
  },

  confirmDate() {
    this.setData({
      showDatePickerModal: false
    })
  },

  // 保存
  async onSave() {
    // 验证
    if (!this.data.formData.name.trim()) {
      wx.showToast({
        title: '请输入名称',
        icon: 'none'
      })
      return
    }
    
    if (!this.data.formData.category) {
      wx.showToast({
        title: '请选择分类',
        icon: 'none'
      })
      return
    }
    
    try {
      wx.showLoading({ title: '保存中...' })
      
      const res = this.data.isEditing
        ? await request({
            url: `/api/memorial/memory-box/${this.data.editingId}`,
            method: 'PUT',
            data: this.data.formData
          })
        : await request({
            url: '/api/memorial/memory-box',
            method: 'POST',
            data: this.data.formData
          })
      
      wx.hideLoading()
      
      if (res.code === 0) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
        
        this.hideAddModal()
        
        this.setData({
          page: 1,
          items: []
        })
        this.getItems()
        this.getStatistics()
      }
    } catch (err) {
      console.error('保存失败', err)
      wx.hideLoading()
    }
  }
})
