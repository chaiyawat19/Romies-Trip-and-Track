export interface ProvinceData {
  nameTh: string;
  nameEn: string;
  region: string;
}

export const THAILAND_PROVINCES: ProvinceData[] = [
  // ภาคกลาง
  { nameTh: 'กรุงเทพมหานคร', nameEn: 'Bangkok', region: 'ภาคกลาง' },
  { nameTh: 'นนทบุรี', nameEn: 'Nonthaburi', region: 'ภาคกลาง' },
  { nameTh: 'ปทุมธานี', nameEn: 'Pathum Thani', region: 'ภาคกลาง' },
  { nameTh: 'พระนครศรีอยุธยา', nameEn: 'Phra Nakhon Si Ayutthaya', region: 'ภาคกลาง' },
  { nameTh: 'อ่างทอง', nameEn: 'Ang Thong', region: 'ภาคกลาง' },
  { nameTh: 'ลพบุรี', nameEn: 'Lop Buri', region: 'ภาคกลาง' },
  { nameTh: 'สิงห์บุรี', nameEn: 'Sing Buri', region: 'ภาคกลาง' },
  { nameTh: 'ชัยนาท', nameEn: 'Chai Nat', region: 'ภาคกลาง' },
  { nameTh: 'สระบุรี', nameEn: 'Saraburi', region: 'ภาคกลาง' },
  { nameTh: 'นครนายก', nameEn: 'Nakhon Nayok', region: 'ภาคกลาง' },
  { nameTh: 'นครปฐม', nameEn: 'Nakhon Pathom', region: 'ภาคกลาง' },
  { nameTh: 'สุพรรณบุรี', nameEn: 'Suphan Buri', region: 'ภาคกลาง' },
  { nameTh: 'สมุทรปราการ', nameEn: 'Samut Prakan', region: 'ภาคกลาง' },
  { nameTh: 'สมุทรสาคร', nameEn: 'Samut Sakhon', region: 'ภาคกลาง' },
  { nameTh: 'สมุทรสงคราม', nameEn: 'Samut Songkhram', region: 'ภาคกลาง' },
  { nameTh: 'เพชรบูรณ์', nameEn: 'Phetchabun', region: 'ภาคกลาง' },
  { nameTh: 'กำแพงเพชร', nameEn: 'Kamphaeng Phet', region: 'ภาคกลาง' },
  { nameTh: 'นครสวรรค์', nameEn: 'Nakhon Sawan', region: 'ภาคกลาง' },
  { nameTh: 'พิจิตร', nameEn: 'Phichit', region: 'ภาคกลาง' },
  { nameTh: 'พิษณุโลก', nameEn: 'Phitsanulok', region: 'ภาคกลาง' },
  { nameTh: 'สุโขทัย', nameEn: 'Sukhothai', region: 'ภาคกลาง' },
  { nameTh: 'อุทัยธานี', nameEn: 'Uthai Thani', region: 'ภาคกลาง' },

  // ภาคเหนือ
  { nameTh: 'เชียงใหม่', nameEn: 'Chiang Mai', region: 'ภาคเหนือ' },
  { nameTh: 'เชียงราย', nameEn: 'Chiang Rai', region: 'ภาคเหนือ' },
  { nameTh: 'ลำปาง', nameEn: 'Lampang', region: 'ภาคเหนือ' },
  { nameTh: 'ลำพูน', nameEn: 'Lamphun', region: 'ภาคเหนือ' },
  { nameTh: 'แม่ฮ่องสอน', nameEn: 'Mae Hong Son', region: 'ภาคเหนือ' },
  { nameTh: 'น่าน', nameEn: 'Nan', region: 'ภาคเหนือ' },
  { nameTh: 'พะเยา', nameEn: 'Phayao', region: 'ภาคเหนือ' },
  { nameTh: 'แพร่', nameEn: 'Phrae', region: 'ภาคเหนือ' },
  { nameTh: 'อุตรดิตถ์', nameEn: 'Uttaradit', region: 'ภาคเหนือ' },

  // ภาคตะวันออกเฉียงเหนือ (อีสาน)
  { nameTh: 'นครราชสีมา', nameEn: 'Nakhon Ratchasima', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { nameTh: 'บุรีรัมย์', nameEn: 'Buri Ram', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { nameTh: 'สุรินทร์', nameEn: 'Surin', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { nameTh: 'ศรีสะเกษ', nameEn: 'Si Sa Ket', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { nameTh: 'อุบลราชธานี', nameEn: 'Ubon Ratchathani', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { nameTh: 'ยโสธร', nameEn: 'Yasothon', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { nameTh: 'ชัยภูมิ', nameEn: 'Chaiyaphum', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { nameTh: 'อำนาจเจริญ', nameEn: 'Amnat Charoen', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { nameTh: 'บึงกาฬ', nameEn: 'Bueng Kan', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { nameTh: 'หนองบัวลำภู', nameEn: 'Nong Bua Lam Phu', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { nameTh: 'ขอนแก่น', nameEn: 'Khon Kaen', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { nameTh: 'อุดรธานี', nameEn: 'Udon Thani', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { nameTh: 'เลย', nameEn: 'Loei', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { nameTh: 'หนองคาย', nameEn: 'Nong Khai', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { nameTh: 'มหาสารคาม', nameEn: 'Maha Sarakham', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { nameTh: 'ร้อยเอ็ด', nameEn: 'Roi Et', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { nameTh: 'กาฬสินธุ์', nameEn: 'Kalasin', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { nameTh: 'สกลนคร', nameEn: 'Sakon Nakhon', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { nameTh: 'นครพนม', nameEn: 'Nakhon Phanom', region: 'ภาคตะวันออกเฉียงเหนือ' },
  { nameTh: 'มุกดาหาร', nameEn: 'Mukdahan', region: 'ภาคตะวันออกเฉียงเหนือ' },

  // ภาคตะวันออก
  { nameTh: 'ชลบุรี', nameEn: 'Chon Buri', region: 'ภาคตะวันออก' },
  { nameTh: 'ระยอง', nameEn: 'Rayong', region: 'ภาคตะวันออก' },
  { nameTh: 'จันทบุรี', nameEn: 'Chanthaburi', region: 'ภาคตะวันออก' },
  { nameTh: 'ตราด', nameEn: 'Trat', region: 'ภาคตะวันออก' },
  { nameTh: 'ฉะเชิงเทรา', nameEn: 'Chachoengsao', region: 'ภาคตะวันออก' },
  { nameTh: 'ปราจีนบุรี', nameEn: 'Prachin Buri', region: 'ภาคตะวันออก' },
  { nameTh: 'สระแก้ว', nameEn: 'Sa Kaeo', region: 'ภาคตะวันออก' },

  // ภาคตะวันตก
  { nameTh: 'กาญจนบุรี', nameEn: 'Kanchanaburi', region: 'ภาคตะวันตก' },
  { nameTh: 'ราชบุรี', nameEn: 'Ratchaburi', region: 'ภาคตะวันตก' },
  { nameTh: 'เพชรบุรี', nameEn: 'Phetchaburi', region: 'ภาคตะวันตก' },
  { nameTh: 'ประจวบคีรีขันธ์', nameEn: 'Prachuap Khiri Khan', region: 'ภาคตะวันตก' },
  { nameTh: 'ตาก', nameEn: 'Tak', region: 'ภาคตะวันตก' },

  // ภาคใต้
  { nameTh: 'นครศรีธรรมราช', nameEn: 'Nakhon Si Thammarat', region: 'ภาคใต้' },
  { nameTh: 'กระบี่', nameEn: 'Krabi', region: 'ภาคใต้' },
  { nameTh: 'พังงา', nameEn: 'Phangnga', region: 'ภาคใต้' },
  { nameTh: 'ภูเก็ต', nameEn: 'Phuket', region: 'ภาคใต้' },
  { nameTh: 'สุราษฎร์ธานี', nameEn: 'Surat Thani', region: 'ภาคใต้' },
  { nameTh: 'ระนอง', nameEn: 'Ranong', region: 'ภาคใต้' },
  { nameTh: 'ชุมพร', nameEn: 'Chumphon', region: 'ภาคใต้' },
  { nameTh: 'สงขลา', nameEn: 'Songkhla', region: 'ภาคใต้' },
  { nameTh: 'สตูล', nameEn: 'Satun', region: 'ภาคใต้' },
  { nameTh: 'ตรัง', nameEn: 'Trang', region: 'ภาคใต้' },
  { nameTh: 'พัทลุง', nameEn: 'Phatthalung', region: 'ภาคใต้' },
  { nameTh: 'ปัตตานี', nameEn: 'Pattani', region: 'ภาคใต้' },
  { nameTh: 'ยะลา', nameEn: 'Yala', region: 'ภาคใต้' },
  { nameTh: 'นราธิวาส', nameEn: 'Narathiwat', region: 'ภาคใต้' },
];
