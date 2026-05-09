// mood-bubble.js
const app = getApp()
const {
	request
} = require('../../../utils/request')
const {
	formatTime,
	UploadImages,
	calculatePetAge
} = require('../../../utils/util')
const urls = require('../../../utils/api')
var QQMapWX = require('../../../utils/qqmap-wx-jssdk.min.js');
var qqmapsdk;
Page({
	data: {
		// 当前宠物
		currentPet: null,
		petAgeDays: 0,

		// 心情标签
		moodTags: [{
				id: 1,
				name: '拆家中',
				emoji: '💥',
				bgColor: '#FFF0F0',
				textColor: '#FF6B6B',
				activeColor: '#FF6B6B',
				activeTextColor: '#FFFFFF'
			},
			{
				id: 2,
				name: '睡得像猪',
				emoji: '🐷',
				bgColor: '#FFF8E6',
				textColor: '#FFB020',
				activeColor: '#FFB020',
				activeTextColor: '#FFFFFF'
			},
			{
				id: 3,
				name: '今日份美貌',
				emoji: '✨',
				bgColor: '#F0FFF4',
				textColor: '#52C41A',
				activeColor: '#52C41A',
				activeTextColor: '#FFFFFF'
			},
			{
				id: 4,
				name: '又被气笑',
				emoji: '😤',
				bgColor: '#FFF0F6',
				textColor: '#FF4D6A',
				activeColor: '#FF4D6A',
				activeTextColor: '#FFFFFF'
			},
			{
				id: 5,
				name: '粘人精上线',
				emoji: '🥺',
				bgColor: '#F0F5FF',
				textColor: '#3366CC',
				activeColor: '#3366CC',
				activeTextColor: '#FFFFFF'
			},
			{
				id: 6,
				name: '干饭人',
				emoji: '🍚',
				bgColor: '#FFF7E6',
				textColor: '#FF9500',
				activeColor: '#FF9500',
				activeTextColor: '#FFFFFF'
			},
			{
				id: 7,
				name: '发呆中',
				emoji: '😶',
				bgColor: '#F5F5F5',
				textColor: '#666666',
				activeColor: '#666666',
				activeTextColor: '#FFFFFF'
			},
			{
				id: 8,
				name: '小天使模式',
				emoji: '👼',
				bgColor: '#E6FFFB',
				textColor: '#13C2C2',
				activeColor: '#13C2C2',
				activeTextColor: '#FFFFFF'
			}
		],
		selectedTag: '',

		// 媒体
		mediaList: [],
		maxMediaCount: 9,

		// 文字内容
		content: '',

		// 自动获取信息
		location: '',
		weather: '',
		enableLocation: true,
		enableWeather: true,

		// 发布状态
		canPublish: false,
		isPublishing: false
	},

	onLoad() {
		qqmapsdk = new QQMapWX({
			key: 'TE6BZ-2BTCO-MOIWF-SA4O6-H52DV-DABDZ'
		});
		this.initPage()
	},

	// 初始化页面
	async initPage() {
		await this.getCurrentPet()
		await this.getLocation()
		this.getUserInfo()
	},
	// 获取用户信息
	getUserInfo() {
		const userInfo = wx.getStorageSync('userInfo')
		this.setData({
			userInfo
		})
	},
	// 获取当前宠物
	async getCurrentPet() {
		const petId = wx.getStorageSync('petId')
		if (petId) {
			try {
				const res = await request({
					url: urls.PetOne + `/${petId}`,
					method: 'GET'
				})
				if (res.code === 200) {
					const currentPet = res.data
					const petAgeDays = calculatePetAge(currentPet.adoptDate || currentPet.birthDate)
				
					this.setData({
						currentPet,
						petAgeDays
					})
				}
			} catch (err) {
				console.error('获取宠物信息失败', err)
			}
		}
	},

	// 获取位置
	getLocation() {
		if (!this.data.enableLocation) {
			this.setData({
				location: ''
			})
			return
		}
		wx.getLocation({
			type: 'gcj02',
			success: async (res) => {
				try {
					this.setData({
						latitude: res.latitude,
						longitude: res.longitude
					})
					// 逆地理编码获取地址// 调用逆地址解析方法
					qqmapsdk.reverseGeocoder({
						location: {
							latitude: res.latitude,
							longitude: res.longitude
						},
						success: (addressRes) => {
							console.log('详细地址：', addressRes.result.address);
							this.setData({
								location: addressRes.result.address
							})
						},
						fail: (error) => {
							console.error('解析地址失败：', error);
						}
					});
				} catch (err) {
					console.error('获取地址失败', err)
					this.setData({
						location: '未知位置'
					})
				}
			},
			fail: (err) => {
				console.error('获取位置失败', err)
				this.setData({
					location: ''
				})
				// 提示用户授权
				if (err.errMsg.includes('auth deny')) {
					wx.showModal({
						title: '提示',
						content: '需要获取您的位置信息，请在设置中开启',
						success: (res) => {
							if (res.confirm) {
								wx.openSetting()
							}
						}
					})
				}
			}
		})
	},



	// 获取天气
	async getWeather() {
		if (this.data.latitude === '' || this.data.longitude === '') {
			return
		}
		let location = this.data.latitude + "," + this.data.longitude
		try {
			// 调用天气API
			const res = await request({
				url: urls.weather,
				method: 'GET',
				data: {
					key: 'YBTBZ-IF7WK-MTMJN-AYYGS-XV4OV-XWBBT',
					location: location
				}
			})
			if (res.code === 200) {

				const weather = `${res.data.text} ${res.data.temp}℃`
				this.setData({
					weather
				})
			}
		} catch (err) {
			console.error('获取天气失败', err)
			this.setData({
				weather: ''
			})
		}
	},

	// 选择心情标签
	selectTag(e) {
		const tag = e.currentTarget.dataset.tag
		this.setData({
			selectedTag: this.data.selectedTag === tag ? '' : tag
		})
		this.checkCanPublish()
	},

	// 选择媒体
	chooseMedia() {
		const remainCount = this.data.maxMediaCount - this.data.mediaList.length

		wx.showActionSheet({
			itemList: ['拍照', '从相册选择'],
			success: (res) => {
				const sourceType = res.tapIndex === 0 ? ['camera'] : ['album']
				this.doChooseMedia(sourceType, remainCount)
			}
		})
	},

	doChooseMedia(sourceType, count) {
		wx.chooseMedia({
			count,
			mediaType: ['image', 'video'],
			sourceType,
			success: (res) => {
				const tempFiles = res.tempFiles.map(file => file.tempFilePath)
				this.setData({
					mediaList: [...this.data.mediaList, ...tempFiles]
				})
				this.checkCanPublish()
			}
		})
	},

	// 预览图片
	previewImage(e) {
		const url = e.currentTarget.dataset.url
		wx.previewImage({
			current: url,
			urls: this.data.mediaList
		})
	},

	// 删除媒体
	deleteMedia(e) {
		const index = e.currentTarget.dataset.index
		const mediaList = [...this.data.mediaList]
		mediaList.splice(index, 1)
		this.setData({
			mediaList
		})
		this.checkCanPublish()
	},

	// 输入内容
	onContentInput(e) {
		this.setData({
			content: e.detail.value
		})
	},

	// 切换位置
	toggleLocation() {
		const enableLocation = !this.data.enableLocation
		this.setData({
			enableLocation
		})
		if (!enableLocation) {
			wx.chooseLocation({
				success: (res) => {
					console.log('用户选择了：', res.name);
					console.log('经纬度：', res.latitude, res.longitude);
					this.setData({
						location: res.name,
						enableLocation: true
					})
				}
			})
		} else {
			this.setData({
				location: '',
				enableLocation: false
			})
		}
	},

	// 切换天气
	toggleWeather() {
		const enableWeather = !this.data.enableWeather
		this.setData({
			enableWeather
		})
		if (enableWeather) {
			this.getWeather()
		} else {
			this.getWeather()
		}
	},

	// 检查是否可以发布
	checkCanPublish() {
		const canPublish = this.data.selectedTag !== '' && this.data.mediaList.length > 0
		this.setData({
			canPublish
		})
	},

	// 发布
	async publish() {
		if (!this.data.canPublish || this.data.isPublishing) return

		this.setData({
			isPublishing: true
		})

		try {
			// 上传图片
			const mediaUrls = await UploadImages({
				tempFiles: this.data.mediaList
			});
			console.log(mediaUrls)

			// 2. 创建记录
			const res = await request({
				url: urls.timelinecreate,
				method: 'POST',
				data: {
					petId: this.data.currentPet.petId,
					recordType: 1, // 心情气泡
					content: this.data.content,
					mediaUrls: mediaUrls.join(','),
					moodTag: this.data.selectedTag,
					location: this.data.enableLocation ? this.data.location : '',
					weather: this.data.enableWeather ? this.data.weather : '',
					petAgeDays: this.data.petAgeDays,
					userId: this.data.userInfo.userId
				}
			})

			if (res.code === 200) {
				wx.showToast({
					title: '发布成功',
					icon: 'success'
				})

				// 返回上一页并刷新
				setTimeout(() => {
					wx.navigateBack()
				}, 1500)
			} else {
				wx.showToast({
					title: res.message || '发布失败',
					icon: 'none'
				})
			}
		} catch (err) {
			console.error('发布失败', err)
			wx.showToast({
				title: '发布失败，请重试',
				icon: 'none'
			})
		} finally {
			this.setData({
				isPublishing: false
			})
		}
	},



	// 返回
	goBack() {
		if (this.data.selectedTag || this.data.mediaList.length > 0 || this.data.content) {
			wx.showModal({
				title: '提示',
				content: '确定放弃编辑吗？',
				success: (res) => {
					if (res.confirm) {
						wx.navigateBack()
					}
				}
			})
		} else {
			wx.navigateBack()
		}
	},

	// 获取选中的心情标签
	get selectedMoodTag() {
		return this.data.moodTags.find(t => t.name === this.data.selectedTag) || {}
	}
})