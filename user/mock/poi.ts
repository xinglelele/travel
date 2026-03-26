export const pois = [
    {
        id: 'poi-1', name: '外滩', category: 'scenery',
        description: '上海最具代表性的历史建筑群，万国建筑博览会，夜景绝美，是上海的城市名片。',
        images: ['https://picsum.photos/seed/waitan/400/300', 'https://picsum.photos/seed/waitan2/400/300'],
        latitude: 31.2397, longitude: 121.4906, address: '黄浦区中山东一路',
        openTime: '全天开放', ticketPrice: 0, phone: '',
        rating: 4.8, commentCount: 32000, distance: 800, tags: ['历史建筑', '夜景', '打卡']
    },
    {
        id: 'poi-2', name: '豫园', category: 'culture',
        description: '明代古典园林，上海老城厢文化中心，园内亭台楼阁、假山池塘，古色古香。',
        images: ['https://picsum.photos/seed/yuyuan/400/300', 'https://picsum.photos/seed/yuyuan2/400/300'],
        latitude: 31.2274, longitude: 121.4927, address: '黄浦区安仁街218号',
        openTime: '09:00-17:00', ticketPrice: 40, phone: '021-63260830',
        rating: 4.6, commentCount: 18500, distance: 1200, tags: ['古典园林', '历史', '文化']
    },
    {
        id: 'poi-3', name: '上海博物馆', category: 'museum',
        description: '中国顶级综合性博物馆，馆藏文物逾百万件，青铜器、陶瓷、书画藏品享誉世界。',
        images: ['https://picsum.photos/seed/shmuseum/400/300'],
        latitude: 31.2298, longitude: 121.4737, address: '黄浦区人民大道201号',
        openTime: '09:00-17:00（周一闭馆）', ticketPrice: 0, phone: '021-63723500',
        rating: 4.9, commentCount: 22000, distance: 600, tags: ['博物馆', '文物', '免费']
    },
    {
        id: 'poi-4', name: '田子坊', category: 'culture',
        description: '上海最具艺术气息的创意园区，石库门弄堂改造而成，汇聚艺术工作室、特色小店与咖啡馆。',
        images: ['https://picsum.photos/seed/tianzifang/400/300'],
        latitude: 31.2108, longitude: 121.4726, address: '黄浦区泰康路210弄',
        openTime: '10:00-22:00', ticketPrice: 0, phone: '',
        rating: 4.5, commentCount: 14000, distance: 2500, tags: ['文创', '艺术', '购物']
    },
    {
        id: 'poi-5', name: '东方明珠广播电视塔', category: 'scenery',
        description: '上海标志性地标，高468米，登塔可俯瞰浦东新区全景与黄浦江两岸风光。',
        images: ['https://picsum.photos/seed/orientalpearl/400/300'],
        latitude: 31.2397, longitude: 121.4997, address: '浦东新区世纪大道1号',
        openTime: '08:00-21:30', ticketPrice: 180, phone: '021-58791888',
        rating: 4.7, commentCount: 28000, distance: 3000, tags: ['地标', '观光', '夜景']
    },
    {
        id: 'poi-6', name: '上海科技馆', category: 'museum',
        description: '国家级综合性科技博物馆，设有天地馆、生命馆、智慧馆等常设展区，寓教于乐。',
        images: ['https://picsum.photos/seed/shtechmuseum/400/300'],
        latitude: 31.2175, longitude: 121.5440, address: '浦东新区世纪大道2000号',
        openTime: '09:00-17:15（周一闭馆）', ticketPrice: 60, phone: '021-68542000',
        rating: 4.7, commentCount: 19000, distance: 4200, tags: ['科技', '博物馆', '亲子']
    },
    {
        id: 'poi-7', name: '朱家角古镇', category: 'culture',
        description: '上海保存最完整的江南水乡古镇，明清建筑、石桥流水，有"上海威尼斯"之称。',
        images: ['https://picsum.photos/seed/zhujiajiao/400/300'],
        latitude: 31.1128, longitude: 121.0622, address: '青浦区朱家角镇',
        openTime: '全天开放', ticketPrice: 0, phone: '',
        rating: 4.6, commentCount: 11000, distance: 8000, tags: ['古镇', '水乡', '历史']
    },
    {
        id: 'poi-8', name: '新天地', category: 'culture',
        description: '以石库门建筑为基础改造的时尚休闲街区，融合历史与现代，餐饮、购物、娱乐一体。',
        images: ['https://picsum.photos/seed/xintiandi/400/300'],
        latitude: 31.2196, longitude: 121.4737, address: '黄浦区马当路181号',
        openTime: '10:00-23:00', ticketPrice: 0, phone: '',
        rating: 4.5, commentCount: 16000, distance: 1800, tags: ['石库门', '购物', '餐饮']
    }
]

export const heatmap = pois.map(p => ({
    latitude: p.latitude + (Math.random() - 0.5) * 0.02,
    longitude: p.longitude + (Math.random() - 0.5) * 0.02,
    weight: Math.floor(Math.random() * 100) + 20
}))
