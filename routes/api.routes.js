const express = require('express');
const pick = require('lodash/pick');
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const sharp = require('sharp');
const crypto = require('crypto');
const auth = require('../middlewares/auth');
const cdnConfig = require('../config/cdnConfig');
const jwtConfig = require('../config/jwtConfig');
const bitrixConfig = require('../config/bitrixConfig');
const dbController = require('../controllers/dbController');
const { sendVerificationEmail, generateToken } = require('../services/emailService');

const router = express.Router();

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    cb(null, file.mimetype.match(/^image\//));
};

const upload = multer({
    storage: storage,
    fileFilter,
    limits: {
        fileSize: 10485760,
    },
});

const manager = {
    id: 1,
    name: "Пивоваров Денис Олегович",
    text: "Мы знаем, как важно создавать условия для комфортной работы наших клиентов и партнеров. И работаем над этим ежедневно. Я всегда на связи по номеру +79124492233, открыт для предложений и готов помочь.",
    photo: "/img/pics/gagarinskii_manager.webp",
};

const gagarinskiTenants = [
    {
        id: 1,
        logo: "/img/pics/gagarinski_tenants/gaz.webp",
        title: "ГАЗ автосервис",
        link: "https://avtogaz18.ru/service-and-spareparts/",
        text: "Предприятие ООО «АвтоГазСервис», является официальным дилером Горьковского автомобильного завода, по обслуживанию и ремонту автомобилей марки ГАЗ. Сервисный центр произведет как глубокий ремонт с пересборкой, так и плановое обслуживание дизельного или бензинового двигателя коммерческого, некоммерческого и легкового транспорта. Современное оборудование в паре с профессионализмом команды сервиса позволяет производить ремонт двигателей даже иностранного производства. Что мы предлагаем нашим клиентам? Подъемники и пост диагностики, смотровые ямы (в том числе для удлиненных автомобилей до 10 м), моторный участок, агрегатный участок.",
    },
    {
        id: 2,
        logo: "/img/pics/gagarinski_tenants/musorovoz.webp",
        title: "Мусоровозов",
        link: "https://xn--18-dlcay2aoabbrkz.xn--p1ai/",
        text: "ООО «Мусоровозов» осуществляет деятельность по обращению с отходами с 2010 года и является одним из крупнейших транспортировщиков отходов на территории Удмуртской Республики, а также оператором по обращению с твердыми коммунальными отходами (ТКО).",
    },
    {
        id: 3,
        logo: "/img/pics/gagarinski_tenants/sereb_kluchi.webp",
        title: "Серебряные ключи +",
        link: "https://voda18.ru/",
        text: "АО «Серебряные ключи» - единственное предприятие в Удмуртии, которое производит минеральные воды всех групп: лечебные, лечебно-столовые, минерализованные, безалкогольные воды, квасные и сокосодержащие напитки. Вся продукция производится из чистейшей артезианской воды. «Серебряные ключи +» это сеть автоматизированных киосков по продаже артезианской воды в розлив «Серебряные ключи +» в городе Ижевске.",
    },
    {
        id: 4,
        logo: "/img/pics/gagarinski_tenants/rmt.webp",
        title: "РМТ Волга",
        link: "https://www.coppertubes.ru/",
        text: "Компания «Русские Медные Трубы» занимает лидирующие  позиции на рынке России и стран Таможенного Союза по поставкам комплектующих и расходных материалов для систем охлаждения, вентиляции, кондиционирования и отопления. Огромный опыт в поставках медной трубы, фитингов и хладагентов позволяет закрывать потребности любых производственных, торговых и монтажных организаций в качественных и доступных материалах. Сеть складов на всей территории России позволяет ускорить процесс получения товара конечным потребителем. В настоящее время у компании 15 региональных складов и распределительных центров в наиболее экономически-активных регионах страны.",
    },
    {
        id: 5,
        logo: "/img/pics/gagarinski_tenants/nahodka.webp",
        title: "Находка",
        link: "https://nahodka-magazin.ru/",
        text: "«НАХОДКА» -  это сеть магазинов низких  цен, для  покупателей, которые хотят и любят экономить, ценят лучшее соотношение ассортимента, цены и качества. Цены в магазинах нашей сети на 15% ниже среднерыночных цен, за счет минимальной торговой надбавки. Оптимальный ассортимент товара, гарантированного качества и свежести, 85% которого приходится на товары ежедневного спроса, исключает незапланированные покупки, а значит и лишние траты. Работа напрямую с федеральными и местными производителями качественных товаров, позволяет покупателю не переплачивать за «раскрученный» бренд и красочную упаковку.",
    },
    {
        id: 6,
        logo: "/img/pics/gagarinski_tenants/food_service.webp",
        title: "Food Сервис",
        link: "https://food-s.ru/",
        text: "Компания «FOOD-Сервис» предлагает крупнейший выбор профессионального кухонного, холодильного оборудования и инвентаря, а также проектирование и сопутствующие сервисные услуги. Компания более 8 лет успешно занимается покупкой и продажей б/у оборудования, а также поставкой нового оборудования для кафе, ресторанов, предприятий общественного питания и магазинов.",
    },
    {
        id: 7,
        logo: "/img/pics/gagarinski_tenants/borsch.webp",
        title: "Сеть столовых Борщ",
        link: "https://borshch18.ru/",
        text: "Сеть столовых «Борщ» предлагает широкий выбор полноценных завтраков и обедов с разнообразным меню на каждый день. Компания имеет собственное производство с соблюдением всех стандартов и требований. Мы готовим только из свежих и качественных продуктов. Привезём обеды на дом, в офис, организуем корпоративное питание. Мы экономим ваше время, чтобы Вы провели его с близкими.",
    },
    {
        id: 8,
        logo: "/img/pics/gagarinski_tenants/nash_garazh.webp",
        title: "Наш Гараж",
        link: "https://nashgarazh-rf.ru/",
        text: "Компания НАШ ГАРАЖ официальный дилер ведущих производителей ворот и автоматики HORMANN, ALUTECH, DoorHan, а также итальянских производителей BFt, Nice и CAMEt.На рынке с 2015 года. Оснащаем ваши дома оборудованием, которое делает жизнь комфортной и безопасной. ГАРАНТИЯ до 10 ЛЕТ. Продаем и устанавливаем: ворота, автоматику к воротам, шлагбаумы, калитки, рольставни.",
    },
    {
        id: 9,
        logo: "/img/pics/gagarinski_tenants/tis.webp",
        title: "Транспортные информационные системы",
        link: "https://www.strizh18.ru/",
        text: "Транспортные информационные системы. Оборудование для автоматизации промышленных предприятий",
    },
    {
        id: 10,
        logo: "/img/pics/gagarinski_tenants/kued_myaso.webp",
        title: "Куединский мясокомбинат",
        link: "https://xn--80abidqabgedcxbiilb1ce2ac7y.xn--p1ai/",
        text: "Фирменный магазин Куединского мясокомбината. Магазин предлагает широкий ассортимент продукции, включая различные виды мяса, колбасы, копчености и деликатесы. Куединские мясопродукты – это экологичность, высокое качество, красивый товарный вид и доступные цены. Все продукты изготавливаются из качественных натуральных ингредиентов.",
    },
    {
        id: 11,
        logo: "/img/pics/gagarinski_tenants/zolot_tabak.webp",
        title: "Золотая Табакерка",
        link: "https://vk.com/goldtabakerka",
        text: "Компания «Золотая табакерка» основана в 2002 году. На сегодняшний день  компания единственная на территории Удмуртской Республики, работающая в формате «Есть всё» по ассортименту табачной продукции.",
    },
    {
        id: 12,
        logo: "/img/pics/gagarinski_tenants/svoya_koleya.webp",
        title: "Сервисный центр Своя Колея",
        link: "https://skoleya.ru/",
        text: "Внедорожная Мастерская «Своя Колея» специализируется на доработке и тюнинге внедорожников. Мы подготавливаем технику к экстремальному бездорожью, охоте и рыбалке.",
    }
]

router
    .route('/search')
    .post(dbController.getRoomsSearch);

router
    .route('/search/types')
    .get(dbController.getRoomsTypes);

router
    .route('/search/buildings')
    .get(dbController.getRoomsLiters);

router
    .route('/report/:base')
    .get(dbController.getRoomsReport);

router
    .route('/premises/:id')
    .get(dbController.getRoomsById);

router
    .route('/premises/floormap/:id')
    .get(dbController.getRoomsByBuilding);

router
    .route('/premises/complex/:id')
    .get(dbController.getRoomsByComplex);

router
    .route('/recommendations/:id')
    .get(dbController.getRoomsRecommended);

router
    .route('/report/print/:id')
    .get((req, res) => {
        res.render('nodes/report-print');
    });

router
    .route('/rented')
    .get(auth, dbController.getRoomsByTenant);

router
    .route('/requests')
    .get(auth, dbController.getTicketsByTenant);

router
    .route('/request/create')
    .post(auth, dbController.insertTicketFromBackoffice);

router
    .route('/tenant/tg')
    .get(auth, dbController.getTenantTgUsername);

router
    .route('/tenant/tg')
    .post(auth, dbController.setTenantTgUsername);

router
    .route('/promotions')
    .post(auth, dbController.setRoomsPromotions);

router
    .route('/docs')
    .get(auth, dbController.getDocsByUser);

router
    .route('/login')
    .post(async (req, res) => {
        try {
            const { login, password } = req.body;
            let user;

            if (/\S+@\S+\.\S+/.test(login)) {
                // Login using email
                user = await dbController.getTenantByParam({ 'email': login });
            } else if (/^\d+$/.test(login)) {
                // Login using TIN
                user = await dbController.getTenantByParam({ 'tin': login });
            } else {
                return res.status(400).json({ success: false, message: 'Invalid login format' });
            }

            if (!user || user.password == null) {
                return res.status(400).json({ success: false, message: 'No such user' });
            }

            if (await bcrypt.compare(password, user.password)) {
                const token = generateToken({ id: user.id, status: user.status, name: user.name });

                return res.cookie("secretToken", token, { httpOnly: true }).json({ success: true });
            } else {
                return res.status(400).json({ success: false, message: 'Wrong password' });
            }
        } catch (err) {
            console.log(err);
            return res.status(500).json({ success: false, message: 'Failed to login' });
        }
    });

router
    .route('/signup/check')
    .post(async (req, res) => {
        try {
            const { tin } = pick(req.body, ['tin']);

            user = await dbController.getTenantByParam({ tin });
            if (user) {
                return res.status(200).json({ exists: true, signedUp: user.email !== '' });
            }
            return res.status(404).json({ exists: false });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ success: false, message: 'Failed to check tin' });
        }
    });

router
    .route('/signup/verify-email')
    .post(async (req, res) => {
        try {
            const { tin, email } = pick(req.body, ['tin', 'email']);

            const user = await dbController.getTenantByParam({ tin });

            if (user) {
                const token = generateToken({ id: user.id, email }, true);
                await sendVerificationEmail(email, token, true);
                return res.status(200).json({ message: 'Verification email sent' });
            }

            return res.status(404).json({ message: 'TIN not found' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Failed to verify email' });
        }
    });

router
    .route('/password-reset/initiate')
    .post(async (req, res) => {
        try {
            const { tin, email } = pick(req.body, ['tin', 'email']);

            user = await dbController.getTenantByParam({ tin, email });

            if (user) {
                const token = generateToken({ id: user.id, email }, true);
                await sendVerificationEmail(email, token, false);
                return res.status(200).json({ message: 'Password reset email sent' });
            }

            return res.status(404).json({ message: 'User not found' });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ success: false, message: 'Failed to verify email' });
        }
    });

router
    .route('/reset-password')
    .post(async (req, res) => {
        const { password, confirmPassword, token } = pick(req.body, ['password', 'confirmPassword', 'token']);

        if (!token) {
            return res.status(400).json({ success: false, message: 'No reset token found' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match' });
        }

        try {
            jwt.verify(token, jwtConfig.emailToken, async (err, decoded) => {
                if (err) {
                    console.log(err);
                    return res.status(400).send("Email verification failed, possibly the link is invalid or expired");
                }
                const hashedPassword = await bcrypt.hash(password, 10);

                const user = await dbController.setTenantPassword(decoded.id, hashedPassword);

                return res.status(200).json({ success: true, message: 'Password reset successfully' });
            });
        } catch (err) {
            console.log(err);
            res.status(400).json({ success: false, message: 'Failed to reset password' });
        }
    });

router
    .route('/contact')
    .post(async (req, res) => {
        const { name, email, phone, url } = pick(req.body, ['name', 'email', 'phone', 'url']);

        try {
            const response = await axios.post(`${bitrixConfig.url}/crm.lead.add`, {
                fields: {
                    TITLE: `Заявка от ${name}`,
                    NAME: name,
                    EMAIL: [{ VALUE: email }],
                    PHONE: [{ VALUE: phone }],
                    WEB: [{ VALUE: url, VALUE_TYPE: "Депо" }],
                }
            });
            res.json({ success: true, data: response.data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

router
    .route('/docs/sign')
    .post(auth, async (req, res) => {
        const { docId, docName, signType, operator } = pick(req.body, ['docId', 'docName', 'signType', 'operator']);
        const user = req.user;

        try {
            const response = await axios.post(`${bitrixConfig.url}/crm.lead.add`, {
                fields: {
                    TITLE: `Заявка на подпись договора ${docName}`,
                    NAME: user.name,
                    COMMENTS: `${docName} (ID: ${docId}), подписание ${signType} ${(operator ? operator : '')}`
                }
            });
            res.json({ success: true, data: response.data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

router
    .route('/docs/request')
    .post(auth, async (req, res) => {
        const { docType, customRequest } = pick(req.body, ['docType', 'customRequest']);
        const user = req.user;

        try {
            const response = await axios.post(`${bitrixConfig.url}/crm.lead.add`, {
                fields: {
                    TITLE: `Заказ документа ${customRequest ? customRequest : docType}`,
                    NAME: user.name,
                    COMMENTS: `Заказан документ ${(customRequest ? customRequest : docType)}`
                }
            });
            res.json({ success: true, data: response.data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

router
    .route('/manager')
    .get(async (req, res) => {
        if (manager) {
            res.json(manager);
        } else {
            res.status(404).json({ error: 'Manager not found' });
        }
    });

router
    .route('/manager/update')
    .post(async (req, res) => {
        try {
            const data = pick(req.body, 'name', 'text', 'photo');
            console.log(data);
            res.status(200);
        } catch (error) {
            res.status(404).json({ error: 'Manager not updated' });
        }
    });

router
    .route('/tenants')
    .get(async (req, res) => {
        if (gagarinskiTenants) {
            res.json(gagarinskiTenants);
        } else {
            res.status(404).json({ error: 'Tenants not found' });
        }
    });

router
    .route('/upload')
    .post(upload.single('file'), async (req, res) => {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'Файл не найден' });
        }

        try {
            const filename = crypto.randomBytes(10).toString('hex').substr(0, 10);

            const webpBuffer = await sharp(file.buffer)
                .webp()
                .toBuffer();

            const formData = new FormData();
            formData.append('file', webpBuffer, {
                filename: `${filename}.webp`,
                contentType: 'image/webp'
            });

            const headers = {
                'Authorization': `Bearer ${cdnConfig.token}`,
                ...formData.getHeaders()
            };

            const response = await axios.post(
                `https://api.cloudflare.com/client/v4/accounts/${cdnConfig.acc}/images/v1`,
                formData,
                { headers }
            );

            res.json(response.data);
        }

        catch (error) {
            console.log('Error uploading photo:', error.response ? error.response.data : error.message);
            res.status(500).json({ message: 'Ошибка при загрузке фотографии' });
        }
    });

module.exports = router;