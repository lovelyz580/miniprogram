// pages/profile/index.js
const app = getApp()
const {
	request
} = require('../../../utils/request')
const urls = require('../../../utils/api')
Page({
	data: {
		// 用户信息
		userInfo: null,
		// 宠物列表
		petList: [],
		petId: null
	},

	onLoad() {
		this.initPage()
	},

	onShow() {
		this.refreshData()
	},

	// 初始化页面
	initPage() {
		this.getUserInfo()
		this.getPetList()
	},

	// 刷新数据
	refreshData() {
		this.getUserInfo()
		this.getPetList()
	},
	getUsername(e){
		let nickname = e.detail.value;
		const userInfo = {
			...this.data.userInfo,
			nickname: nickname
		}
		wx.setStorageSync('userInfo', userInfo)
		this.setData({
			userInfo
		})
	},
	updateUsername(){
		const userInfo =this.data.userInfo;
		const data = {
			userId: userInfo.userId,
			nickname: userInfo.nickname,
		}
		const update_res = request({
			url: urls.updateUserAvatarUrl,
			method: 'POST',
			data
		})
	},

	// 获取用户信息
	getUserInfo() {
		const userInfo = wx.getStorageSync('userInfo') || null;
		this.setData({
			userInfo
		})
	},

	// 获取宠物列表
	async getPetList() {
		if (!this.data.userInfo) {
			// 未登录在 checkLoginForAvatar 会跳转，这里直接中断即可
			return
		}
		let userId = this.data.userInfo.userId;
		try {
			const res = await request({
				url: urls.PetList,
				method: 'GET',
				data:{
					userId:userId
				}
			})

			if (res.code === 200) {
				const petList = res.data || []
				const petId = wx.getStorageSync('petId')

				this.setData({
					petList,
					petId: petId || (petList.length > 0 ? petList[0].petId : null)
				})
			}
		} catch (err) {
			console.error('获取宠物列表失败', err)
		}
	},

	// 选择宠物
	selectPet(e) {
		const {
			id
		} = e.currentTarget.dataset
		if (id === this.data.petId) return

		wx.setStorageSync('petId', id)
		this.setData({
			petId: id
		})

		wx.showToast({
			title: '已切换',
			icon: 'success'
		})
	},

	// 点击头像区域检查登录状态
	checkLoginForAvatar() {
		if (!this.data.userInfo) {
			this.goToLogin()
		}
	},

	// 微信最新支持的获取头像方式
	onChooseAvatar(e) {
		if (!this.data.userInfo) {
			// 未登录在 checkLoginForAvatar 会跳转，这里直接中断即可
			return
		}
		const {
			avatarUrl
		} = e.detail;
		this.uploadAvatar(avatarUrl)
	},
	//选择头像
	chooseAvatar(e) {
		wx.chooseImage({
			count: 1,
			sizeType: ['compressed'],
			sourceType: ['album', 'camera'],
			success: (res) => {
				const tempFilePaths = res.tempFilePaths
				this.uploadAvatar(tempFilePaths[0]);
			}
		})
	},

	// 上传头像
	uploadAvatar: function (filePath) {
		wx.showLoading({
			title: '上传中...'
		})
		try {
			wx.uploadFile({
				url: urls.upload,
				filePath: filePath,
				name: 'file',
				formData: {},
				header: {
					"Content-Type": "multipart/form-data"
				},
				success: (res) => {
					const res_1 = JSON.parse(res.data);
					if (res_1.code === 200) {
						this.updateUseravatarUrl(res_1);
					}
				},
			})
		} catch (err) {
			console.error('上传头像失败', err)
			wx.showToast({
				title: '上传失败',
				icon: 'none'
			})
		} finally {
			wx.hideLoading()
		}
	},
	/**
	 * 更新头像信息
	 * @param {*} res 
	 */
	updateUseravatarUrl(res) {
		const avatarUrl = urls.imgUrl + res.url;
		const userInfo = {
			...this.data.userInfo,
			avatarUrl: avatarUrl
		}
		wx.setStorageSync('userInfo', userInfo)
		this.setData({
			userInfo
		})
		const data = {
			userId: userInfo.userId,
			avatarUrl: avatarUrl,
		}
		const update_res = request({
			url: urls.updateUserAvatarUrl,
			method: 'POST',
			data
		})

		wx.showToast({
			title: '上传成功',
			icon: 'success'
		})
	},

	// 跳转登录
	goToLogin() {
		wx.navigateTo({
			url: '/pages/login/login'
		})
	},

	// 添加宠物
	goToAddPet() {
		if (!this.data.userInfo) {
			// 未登录在 checkLoginForAvatar 会跳转，这里直接中断即可
			return
		}

		wx.navigateTo({
			url: '/pages/pet/add/add'
		})
	},
	// 编辑宠物
  editPet(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/pet/edit/edit?id=${id}`
    })
  },

	// 跳转设置
	goToSettings() {
		wx.navigateTo({
			url: '/pages/profile/settings/settings'
		})
	},
	// 我的记录
	goToRecordList() {
		wx.navigateTo({
			url: '/pages/record/list/list'
		})
	},
	// 跳转帮助与反馈
	goToHelp() {
		wx.navigateTo({
			url: '/pages/profile/feedback/feedback'
		})
	},

	// 跳转关于我们
	goToAbout() {
		wx.showModal({
			title: '关于爪印记忆',
			content: '爪印记忆是一款专注于宠物健康管理的微信小程序，帮助主人科学记录和管理宠物的健康数据。\n\n版本：V1.0.0',
			showCancel: false
		})
	},

	// 跳转会员
	goToVip() {
		wx.navigateTo({
			url: '/pages/profile/vip'
		})
	},

	// 退出登录
	logout() {
		wx.showModal({
			title: '确认退出',
			content: '确定要退出登录吗？',
			success: (res) => {
				if (res.confirm) {
					// 清除登录信息
					wx.removeStorageSync('token')
					wx.removeStorageSync('userInfo')
					this.setData({
						userInfo: null
					})
					wx.showToast({
						title: '已退出',
						icon: 'success'
					})
					// 可选：跳转到登录页
					// wx.navigateTo({
					//   url: '/pages/login/login'
					// })
				}
			}
		})
	}
})