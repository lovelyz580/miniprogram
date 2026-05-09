// utils/util.js
import {
	upload,imgUrl
} from './api';
/**
 * 格式化时间
 * @param {Date|number|string} date 时间对象或时间戳
 * @param {string} format 格式模板，如 'yyyy-MM-dd HH:mm:ss'
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(date, format = 'yyyy-MM-dd HH:mm:ss') {
	if (!date) return ''

	const d = new Date(date)
	if (isNaN(d.getTime())) return ''

	const map = {
		'yyyy': d.getFullYear(),
		'MM': String(d.getMonth() + 1).padStart(2, '0'),
		'dd': String(d.getDate()).padStart(2, '0'),
		'HH': String(d.getHours()).padStart(2, '0'),
		'mm': String(d.getMinutes()).padStart(2, '0'),
		'ss': String(d.getSeconds()).padStart(2, '0')
	}

	return format.replace(/yyyy|MM|dd|HH|mm|ss/g, (key) => map[key])
}

/**
 * 计算宠龄天数
 * @param {Date|string} startDate 开始日期（领养日或出生日）
 * @param {Date|string} endDate 结束日期（默认为今天）
 * @returns {number} 天数
 */
function calculatePetAge(startDate, endDate = new Date()) {
	if (!startDate) return 0
	const start = new Date(startDate)
	const end = new Date(endDate)
	if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0

	const diffTime = end - start
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

	return Math.max(0, diffDays)
}

/**
 * 计算宠龄（年月格式）
 * @param {Date|string} startDate 开始日期
 * @param {Date|string} endDate 结束日期（默认为今天）
 * @returns {string} 如 "2岁3个月"
 */
function calculatePetAgeFormat(startDate, endDate = new Date()) {
	if (!startDate) return ''

	const diffDays = calculatePetAge(startDate, endDate)

	if (diffDays < 30) {
		return `${diffDays}天`
	}

	const years = Math.floor(diffDays / 365)
	const months = Math.floor((diffDays % 365) / 30)

	if (years > 0) {
		return months > 0 ? `${years}岁${months}个月` : `${years}岁`
	}

	return `${months}个月`
}

/**
 * 生成唯一ID
 * @returns {string} 唯一标识
 */
function generateId() {
	return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

/**
 * 深拷贝
 * @param {any} obj 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
function deepClone(obj) {
	if (obj === null || typeof obj !== 'object') return obj

	const result = Array.isArray(obj) ? [] : {}

	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			result[key] = deepClone(obj[key])
		}
	}

	return result
}

/**
 * 防抖函数
 * @param {Function} func 要防抖的函数
 * @param {number} delay 延迟时间(ms)
 * @returns {Function} 防抖后的函数
 */
function debounce(func, delay = 300) {
	let timer = null

	return function (...args) {
		if (timer) {
			clearTimeout(timer)
		}

		timer = setTimeout(() => {
			func.apply(this, args)
		}, delay)
	}
}

/**
 * 节流函数
 * @param {Function} func 要节流的函数
 * @param {number} delay 延迟时间(ms)
 * @returns {Function} 节流后的函数
 */
function throttle(func, delay = 300) {
	let timer = null

	return function (...args) {
		if (timer) return

		timer = setTimeout(() => {
			func.apply(this, args)
			timer = null
		}, delay)
	}
}

// 配置：限制文件大小为5MB，支持的图片格式
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const VALID_FORMATS = ['jpg', 'jpeg', 'png'];

// 校验图片格式
const validateImageType = (filePath) => {
	const fileExtension = filePath.split('.').pop()?.toLowerCase();
	return VALID_FORMATS.includes(fileExtension);
};

// 校验图片大小
const validateImageSize = (fileSize) => {
	return fileSize <= MAX_FILE_SIZE;
};

/**
 * 选择并上传图片（核心函数）
 * @param {Object} options - 配置项
 * @param {number} [options.count=1] - 允许选择的最大图片数量
 * @param {Object} [options.formData={}] - 上传时额外携带的表单数据
 * @param {Array} [options.sourceType=['album', 'camera']] - 选择图片来源
 * @returns {Promise<string | string[]>} - 单张图返回URL字符串，多张图返回URL数组
 */
export const UploadImages = ({tempFiles=tempFiles} = {}) => {
	return new Promise((resolve, reject) => {
		// 3. 批量上传图片
		const uploadPromises = tempFiles.map((tempFilePath) => {
			return new Promise((uploadResolve, uploadReject) => {
				wx.uploadFile({
					url: `${upload}`, // 替换为你的上传接口地址
					filePath: tempFilePath,
					name: 'file',
					formData: {},
					success: (uploadRes) => {
						try {
							const data = JSON.parse(uploadRes.data);
							if (data.code === 200) {
								uploadResolve(data.url); // 假设后端返回的URL在data.data.url中
							} else {
								uploadReject(new Error(data.message || '上传失败'));
							}
						} catch (error) {
							uploadReject(new Error('解析服务器响应失败'));
						}
					},
					fail: (err) => {
						console.error('上传请求失败', err);
						uploadReject(new Error('网络请求失败，请稍后重试'));
					}
				});
			});
		});
		// 等待所有图片上传完成
		Promise.all(uploadPromises)
			.then((results) => {
				resolve(results);
			})
			.catch((err) => reject(err));

	});
}


function formatImgUrl(str) {
	if (!str) {
		return [];
	}
	// 分割字符串
	var arr = str.split(",");
	var mediaUrls = [];
	// 去除空格
	for (var i = 0; i < arr.length; i++) {
		var item = arr[i].trim();
		if (item !== '') {
			mediaUrls.push(item);
		}
	}
	// 拼接URL
	var result = [];
	for (var i = 0; i < mediaUrls.length; i++) {
		var item = mediaUrls[i];
		if (item.indexOf('http://') === 0 || item.indexOf('https://') === 0) {
			result.push(item);
		} else {
			result.push(`${imgUrl}` + item);
		}
	}
	return result;
}

function ShowImgUrl(str) {
	if (!str) {
		return [];
	}

	// 分割字符串
	var arr = str.split(",");
	var mediaUrls = [];
	// 去除空格
	for (var i = 0; i < arr.length; i++) {
		var item = arr[i].trim();
		if (item !== '') {
			mediaUrls.push(item);
		}
	}
	// 拼接URL
	var result = [];
	for (var i = 0; i < mediaUrls.length; i++) {
		var item = mediaUrls[i];
		var url = "";
		if (item.indexOf('http://') === 0 || item.indexOf('https://') === 0) {
			result.push(item);
		} else {
			url = `${imgUrl}` + item;
		}
		if(isImage(item)){
			result.push({url:url,type:'image'});
		}else if(isVideo(item)){
			result.push({url:url,type:'video'});
		}
	}
	return result;
}
function isImage(fileName) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'].includes(ext);
}

function isVideo(fileName) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg', '3gp'].includes(ext);
}

module.exports = {
	formatTime,
	calculatePetAge,
	calculatePetAgeFormat,
	generateId,
	deepClone,
	debounce,
	throttle,
	formatImgUrl,
	UploadImages,
	ShowImgUrl
}