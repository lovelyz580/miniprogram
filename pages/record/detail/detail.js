// detail.js
const app = getApp()
const { request } = require('../../../utils/request')
const { formatTime,ShowImgUrl ,calculatePetAgeFormat} = require('../../../utils/util')
const urls = require('../../../utils/api')
Page({
  data: {
    // 记录ID
    recordId: '',
    isPreview: false,
    
    // 记录详情
    record: {},
    
    // 评论列表
    comments: [],
    commentPage: 1,
    commentPageSize: 20,
    hasMoreComments: false,
    isLoadingComments: false,
    
    // 评论输入
    commentText: '',
    replyTo: null,
    
    // 弹窗控制
    showActionSheet: false,
    showShareModal: false,
    
    // 是否是自己的记录
    isOwner: false
  },

  onLoad(options) {
		const recordType = options.recordType || 'timeline' // 默认为时光轴记录
    this.setData({
      recordType
    })
    if (options.isPreview === 'true') {
      this.setData({
        isPreview: true,
        record: app.globalData.previewRecord || {}
      })
    } else if (options.id) {
      this.setData({
        recordId: options.id
      })
      this.getRecordDetail(options.id,recordType)
      // this.getComments()
    }
  },

  // 获取记录详情
  async getRecordDetail(id,recordType) {
    try {
      wx.showLoading({ title: '加载中...' })
      // debugger
			let recordOneUrl = "";
			if("milestone" === recordType){
				recordOneUrl = urls.Milestone+`/${id}`
			} else{
				recordOneUrl = urls.recordOne+`/${id}`
			}
      const res = await request({
        url: recordOneUrl,
        method: 'GET'
      })
      
      if (res.code === 200 && res.data) {
        const record = res.data
        const userInfo = wx.getStorageSync('userInfo')
				const baseDate = record.adoptDate || record.birthDate
        const age = calculatePetAgeFormat(baseDate, record.milestoneDate)
        this.setData({
          record:{
						...record,
						petAgeAtDate: age,
						mediaUrls: ShowImgUrl(record.mediaUrls),
					},
          isOwner: userInfo && record.userId === userInfo.userId
        })
      }
      
      wx.hideLoading()
    } catch (err) {
      console.error('获取记录详情失败', err)
      wx.hideLoading()
    }
  },

  // 获取评论列表
  async getComments() {
    if (this.data.isLoadingComments) return
    
    try {
      this.setData({ isLoadingComments: true })
      
      const res = await request({
        url: `/api/record/${this.data.recordId}/comments`,
        method: 'GET',
        data: {
          page: this.data.commentPage,
          pageSize: this.data.commentPageSize
        }
      })
      
      if (res.code === 0) {
        const comments = res.data.list || []
        this.setData({
          comments: this.data.commentPage === 1 ? comments : [...this.data.comments, ...comments],
          hasMoreComments: comments.length >= this.data.commentPageSize,
          isLoadingComments: false
        })
      } else {
        this.setData({ isLoadingComments: false })
      }
    } catch (err) {
      console.error('获取评论失败', err)
      this.setData({ isLoadingComments: false })
    }
  },

  // 加载更多评论
  loadMoreComments() {
    this.setData({
      commentPage: this.data.commentPage + 1
    })
    this.getComments()
  },

  // 返回
  goBack() {
    wx.navigateBack()
  },

  // 显示更多操作
  showMoreActions() {
    if (this.data.isPreview) {
      wx.showToast({
        title: '预览模式不支持操作',
        icon: 'none'
      })
      return
    }
    
    this.setData({
      showActionSheet: true
    })
  },

  hideActionSheet() {
    this.setData({
      showActionSheet: false
    })
  },

  // 编辑
  onEdit() {
    this.hideActionSheet()
    
    wx.navigateTo({
      url: `/pages/record/diary/diary?recordId=${this.data.recordId}`
    })
  },

  // 删除
  onDelete() {
    this.hideActionSheet()
    
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.deleteRecord()
        }
      }
    })
  },

  async deleteRecord() {
    try {
      wx.showLoading({ title: '删除中...' })
      
      const res = await request({
        url: `/api/record/${this.data.recordId}`,
        method: 'DELETE'
      })
      
      wx.hideLoading()
      
      if (res.code === 0) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        })
        
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (err) {
      console.error('删除失败', err)
      wx.hideLoading()
    }
  },

  // 复制链接
  onCopyLink() {
    this.hideActionSheet()
    
    wx.setClipboardData({
      data: `${app.globalData.h5BaseUrl}/pages/record/detail/detail?id=${this.data.recordId}`,
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'success'
        })
      }
    })
  },

  // 举报
  onReport() {
    this.hideActionSheet()
    
    wx.showModal({
      title: '举报',
      content: '确定要举报这条内容吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await request({
              url: '/api/report',
              method: 'POST',
              data: {
                type: 'record',
                targetId: this.data.recordId
              }
            })
            
            wx.showToast({
              title: '举报成功',
              icon: 'success'
            })
          } catch (err) {
            console.error('举报失败', err)
          }
        }
      }
    })
  },

  // 点赞/取消点赞
  async toggleLike() {
    if (this.data.isPreview) return
    
    try {
      const isLiked = this.data.record.isLiked
      const likeCount = this.data.record.likeCount || 0
      
      // 乐观更新
      this.setData({
        'record.isLiked': !isLiked,
        'record.likeCount': isLiked ? likeCount - 1 : likeCount + 1
      })
      
      const res = await request({
        url: `/api/record/${this.data.recordId}/like`,
        method: isLiked ? 'DELETE' : 'POST'
      })
      
      if (res.code !== 0) {
        // 回滚
        this.setData({
          'record.isLiked': isLiked,
          'record.likeCount': likeCount
        })
      }
    } catch (err) {
      console.error('点赞操作失败', err)
    }
  },

  // 评论点赞
  async likeComment(e) {
    if (this.data.isPreview) return
    
    const commentId = e.currentTarget.dataset.id
    const comment = this.data.comments.find(c => c.id === commentId)
    if (!comment) return
    
    try {
      const isLiked = comment.isLiked
      const likeCount = comment.likeCount || 0
      
      // 乐观更新
      const comments = this.data.comments.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            isLiked: !isLiked,
            likeCount: isLiked ? likeCount - 1 : likeCount + 1
          }
        }
        return c
      })
      
      this.setData({ comments })
      
      const res = await request({
        url: `/api/comment/${commentId}/like`,
        method: isLiked ? 'DELETE' : 'POST'
      })
      
      if (res.code !== 0) {
        // 回滚
        this.setData({
          comments: this.data.comments.map(c => {
            if (c.id === commentId) {
              return { ...c, isLiked, likeCount }
            }
            return c
          })
        })
      }
    } catch (err) {
      console.error('评论点赞失败', err)
    }
  },

  // 滚动到评论区
  scrollToComments() {
    wx.pageScrollTo({
      selector: '#comments',
      duration: 300
    })
  },

  // 评论输入
  onCommentInput(e) {
    this.setData({
      commentText: e.detail.value
    })
  },

  onCommentFocus() {
    // 滚动到底部
  },

  onCommentBlur() {
    // 如果没有回复对象，清空回复状态
    if (!this.data.commentText) {
      this.setData({
        replyTo: null
      })
    }
  },

  // 回复评论
  onReply(e) {
    const comment = e.currentTarget.dataset.comment
    this.setData({
      replyTo: comment
    })
    
    // 聚焦输入框
    wx.pageScrollTo({
      selector: '.comment-input-section',
      duration: 300
    })
  },

  // 提交评论
  async submitComment() {
    if (!this.data.commentText.trim()) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      })
      return
    }
    
    try {
      const data = {
        recordId: this.data.recordId,
        content: this.data.commentText,
        replyId: this.data.replyTo?.id
      }
      
      const res = await request({
        url: '/api/comment',
        method: 'POST',
        data
      })
      
      if (res.code === 0) {
        wx.showToast({
          title: '评论成功',
          icon: 'success'
        })
        
        this.setData({
          commentText: '',
          replyTo: null,
          commentPage: 1
        })
        
        // 刷新评论列表
        this.getComments()
        
        // 更新评论数
        this.setData({
          'record.commentCount': (this.data.record.commentCount || 0) + 1
        })
      }
    } catch (err) {
      console.error('评论失败', err)
    }
  },

  // 预览媒体
  previewMedia(e) {
    const index = e.currentTarget.dataset.index
    const urls = this.data.record.mediaUrls
      .filter(item => !item.type || item.type === 'image')
      .map(item => item.url)
    
    wx.previewImage({
      current: urls[index],
      urls
    })
  },

  // 分享
  onShare() {
    if (this.data.isPreview) {
      wx.showToast({
        title: '预览模式不支持分享',
        icon: 'none'
      })
      return
    }
    
    this.setData({
      showShareModal: true
    })
  },

  hideShareModal() {
    this.setData({
      showShareModal: false
    })
  },

  // 分享给好友
  shareToFriend() {
    this.hideShareModal()
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage']
    })
  },

  // 分享到朋友圈
  shareToMoments() {
    this.hideShareModal()
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareTimeline']
    })
  },

  // 保存海报
  savePoster() {
    this.hideShareModal()
    
    wx.showToast({
      title: '正在生成海报...',
      icon: 'loading'
    })
    
    // 生成海报逻辑
    // ...
  },

  // 页面分享配置
  onShareAppMessage() {
    return {
      title: `${this.data.record.pet.name || '宠物'}的记录`,
      path: `/pages/record/detail/detail?id=${this.data.recordId}`,
      imageUrl: this.data.record.mediaUrls?.[0] || ''
    }
  },

  onShareTimeline() {
    return {
      title: `${this.data.record.pet.name || '宠物'}的记录`,
      query: `id=${this.data.recordId}`,
      imageUrl: this.data.record.mediaUrls?.[0] || ''
    }
  }
})
