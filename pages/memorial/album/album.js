// album.js
const app = getApp()
const { request } = require('../../../utils/request')
const { formatTime } = require('../../../utils/util')

Page({
  data: {
    // 宠物信息
    petId: '',
    pet: {},
    
    // 纪念语
    memorialMessage: '',
    
    // 照片列表
    photos: [],
    
    // 时间线
    timeline: [],
    
    // 里程碑
    milestones: [],
    
    // 思念墙
    memories: [],
    
    // 弹窗控制
    showPickerModal: false,
    showMemoryModal: false,
    memoryText: ''
  },

  onLoad(options) {
    if (options.petId) {
      this.setData({
        petId: options.petId
      })
      this.loadAlbumData(options.petId)
    }
  },

  // 加载纪念册数据
  async loadAlbumData(petId) {
    try {
      wx.showLoading({ title: '加载中...' })
      
      const res = await request({
        url: `/api/memorial/album/${petId}`,
        method: 'GET'
      })
      
      if (res.code === 0 && res.data) {
        const data = res.data
        
        this.setData({
          pet: data.pet || {},
          memorialMessage: data.memorialMessage || '永远爱你 ❤️',
          photos: data.photos || [],
          timeline: data.timeline || [],
          milestones: data.milestones || [],
          memories: data.memories || []
        })
      }
      
      wx.hideLoading()
    } catch (err) {
      console.error('加载纪念册数据失败', err)
      wx.hideLoading()
    }
  },

  // 预览照片
  previewPhoto(e) {
    const index = e.currentTarget.dataset.index
    const urls = this.data.photos.map(p => p.url)
    
    wx.previewImage({
      current: urls[index],
      urls
    })
  },

  // 添加照片
  addPhoto() {
    this.setData({
      showPickerModal: true
    })
  },

  hidePicker() {
    this.setData({
      showPickerModal: false
    })
  },

  // 从相册选择
  chooseFromAlbum() {
    this.hidePicker()
    
    wx.chooseImage({
      count: 9,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: async (res) => {
        wx.showLoading({ title: '上传中...' })
        
        const tempFilePaths = res.tempFilePaths
        const uploadedUrls = []
        
        for (const path of tempFilePaths) {
          try {
            const uploadRes = await wx.uploadFile({
              url:  + '/api/memorial/upload',
              filePath: path,
              name: 'file',
              header: {
                'Authorization': wx.getStorageSync('token') || ''
              }
            })
            
            const result = JSON.parse(uploadRes.data)
            if (result.code === 0) {
              uploadedUrls.push({
                url: result.data.url,
                date: formatTime(new Date())
              })
            }
          } catch (err) {
            console.error('上传失败', err)
          }
        }
        
        wx.hideLoading()
        
        if (uploadedUrls.length > 0) {
          this.addPhotosToAlbum(uploadedUrls)
        }
      }
    })
  },

  // 拍照
  takePhoto() {
    this.hidePicker()
    
    wx.chooseImage({
      count: 1,
      sourceType: ['camera'],
      success: async (res) => {
        wx.showLoading({ title: '上传中...' })
        
        try {
          const uploadRes = await wx.uploadFile({
            url:  + '/api/memorial/upload',
            filePath: res.tempFilePaths[0],
            name: 'file',
            header: {
              'Authorization': wx.getStorageSync('token') || ''
            }
          })
          
          const result = JSON.parse(uploadRes.data)
          
          if (result.code === 0) {
            this.addPhotosToAlbum([{
              url: result.data.url,
              date: formatTime(new Date())
            }])
          }
          
          wx.hideLoading()
        } catch (err) {
          console.error('上传失败', err)
          wx.hideLoading()
        }
      }
    })
  },

  // 添加照片到纪念册
  async addPhotosToAlbum(photos) {
    try {
      const res = await request({
        url: `/api/memorial/album/${this.data.petId}/photos`,
        method: 'POST',
        data: { photos }
      })
      
      if (res.code === 0) {
        this.setData({
          photos: [...this.data.photos, ...photos]
        })
        
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        })
      }
    } catch (err) {
      console.error('添加照片失败', err)
    }
  },

  // 生成海报
  generatePoster() {
    wx.showToast({
      title: '正在生成...',
      icon: 'loading'
    })
    
    // 生成海报逻辑
    // ...
  },

  // 分享纪念册
  shareAlbum() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  // 写下思念
  writeMemory() {
    this.setData({
      showMemoryModal: true,
      memoryText: ''
    })
  },

  hideMemoryModal() {
    this.setData({
      showMemoryModal: false
    })
  },

  onMemoryInput(e) {
    this.setData({
      memoryText: e.detail.value
    })
  },

  // 提交思念
  async submitMemory() {
    if (!this.data.memoryText.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      })
      return
    }
    
    try {
      const res = await request({
        url: `/api/memorial/album/${this.data.petId}/memory`,
        method: 'POST',
        data: {
          content: this.data.memoryText
        }
      })
      
      if (res.code === 0) {
        wx.showToast({
          title: '发布成功',
          icon: 'success'
        })
        
        this.setData({
          showMemoryModal: false,
          memoryText: ''
        })
        
        // 刷新思念列表
        this.loadMemories()
      }
    } catch (err) {
      console.error('发布思念失败', err)
    }
  },

  // 加载思念列表
  async loadMemories() {
    try {
      const res = await request({
        url: `/api/memorial/album/${this.data.petId}/memories`,
        method: 'GET'
      })
      
      if (res.code === 0) {
        this.setData({
          memories: res.data || []
        })
      }
    } catch (err) {
      console.error('加载思念列表失败', err)
    }
  },

  // 查看全部思念
  viewAllMemories() {
    wx.navigateTo({
      url: `/pages/memorial/memories/memories?petId=${this.data.petId}`
    })
  },

  // 分享配置
  onShareAppMessage() {
    return {
      title: `怀念 ${this.data.pet.name}`,
      path: `/pages/memorial/album/album?petId=${this.data.petId}`,
      imageUrl: this.data.photos[0]?.url || ''
    }
  },

  onShareTimeline() {
    return {
      title: `怀念 ${this.data.pet.name}`,
      query: `petId=${this.data.petId}`,
      imageUrl: this.data.photos[0]?.url || ''
    }
  }
})
