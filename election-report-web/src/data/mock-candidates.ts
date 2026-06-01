import type { Candidate } from "../types/election";

export const mockCandidates: Candidate[] = [
  {
    id: "mock-governor-seoul-01",
    electionId: "20260603",
    electionName: "제9회 전국동시지방선거",
    officeType: "governor",
    officeName: "서울특별시장",
    regionName: "서울특별시",
    partyName: "샘플정당",
    candidateName: "서울시장 샘플 후보",
    ballotNumber: "1",
    status: "mock",
    age: 58,
    gender: "남",
    job: "전 지방자치단체장",
    education: "정책대학원 졸업",
    careers: ["전 서울시 부시장", "전 국회 정책자문위원"],
    pledges: [
      {
        id: "pledge-seoul-01",
        title: "출퇴근 30분 생활권",
        summary: "광역 교통 환승 축을 정비하고 혼잡 구간을 단계적으로 개선",
        category: "교통",
        details: ["환승센터 재설계", "버스 노선 중복 조정", "심야 이동권 확대"]
      },
      {
        id: "pledge-seoul-02",
        title: "청년 주거 사다리",
        summary: "역세권 공공임대와 보증금 지원을 묶은 주거 안정 패키지",
        category: "주거",
        details: ["공공임대 물량 확대", "월세 부담 완화", "주거 상담 창구 통합"]
      },
      {
        id: "pledge-seoul-03",
        title: "골목상권 회복",
        summary: "상권 데이터 기반으로 임대료, 금융, 판로 지원을 집중",
        category: "경제",
        details: ["상권별 회복지표 공개", "소상공인 금융지원", "지역 축제 연계"]
      }
    ],
    material: {
      status: "analyzed",
      pageCount: 12,
      dominantColors: ["#164ea6", "#ffffff", "#e23b3b"],
      fontNotes: "굵은 고딕 계열 제목과 좁은 자간의 본문 조합",
      layoutNotes: "상단 슬로건, 중앙 인물 사진, 하단 3대 공약 카드 구조"
    },
    source: {
      candidateApiId: "mock-1000000001",
      pledgeApiId: "mock-1000000001",
      fetchedAt: "2026-06-01T00:00:00+09:00"
    }
  },
  {
    id: "mock-governor-gyeonggi-01",
    electionId: "20260603",
    electionName: "제9회 전국동시지방선거",
    officeType: "governor",
    officeName: "경기도지사",
    regionName: "경기도",
    partyName: "미래샘플당",
    candidateName: "경기도지사 샘플 후보",
    ballotNumber: "2",
    status: "mock",
    age: 54,
    gender: "여",
    job: "전 국회의원",
    education: "행정학 박사",
    careers: ["전 국회 예산결산위원", "전 경기도 정책특보"],
    pledges: [
      {
        id: "pledge-gyeonggi-01",
        title: "1기 신도시 재정비",
        summary: "주거 안전과 기반시설 확충을 묶어 재정비 속도를 높임",
        category: "도시",
        details: ["노후 기반시설 조사", "정비구역 절차 간소화", "이주 지원 설계"]
      },
      {
        id: "pledge-gyeonggi-02",
        title: "반도체 산업벨트",
        summary: "남부권 산업 거점을 교육, 교통, 주거와 연결",
        category: "산업",
        details: ["산학 캠퍼스 구축", "광역버스 증차", "협력업체 금융지원"]
      },
      {
        id: "pledge-gyeonggi-03",
        title: "돌봄 통합 플랫폼",
        summary: "시군별 돌봄 자원을 통합 조회하고 긴급 돌봄을 연계",
        category: "복지",
        details: ["긴급돌봄 예약", "지역 센터 연계", "보호자 알림 체계"]
      }
    ],
    material: {
      status: "collected",
      pageCount: 8,
      dominantColors: ["#0f7b5f", "#f6f8fb", "#222222"],
      fontNotes: "제목은 두꺼운 고딕, 본문은 중간 굵기의 산세리프",
      layoutNotes: "정책별 색상 띠와 인포그래픽이 반복되는 편집 구조"
    },
    source: {
      candidateApiId: "mock-1000000002",
      pledgeApiId: "mock-1000000002",
      fetchedAt: "2026-06-01T00:00:00+09:00"
    }
  },
  {
    id: "mock-governor-busan-01",
    electionId: "20260603",
    electionName: "제9회 전국동시지방선거",
    officeType: "governor",
    officeName: "부산광역시장",
    regionName: "부산광역시",
    partyName: "무소속",
    candidateName: "부산시장 샘플 후보",
    ballotNumber: "7",
    status: "mock",
    age: 61,
    gender: "남",
    job: "도시계획 전문가",
    education: "도시공학 석사",
    careers: ["전 부산항 자문위원", "전 도시재생센터장"],
    pledges: [
      {
        id: "pledge-busan-01",
        title: "항만 재생 프로젝트",
        summary: "원도심, 항만, 관광을 잇는 해양 산업 전환 전략",
        category: "도시",
        details: ["수변 보행축 조성", "항만 창업공간", "관광 동선 정비"]
      },
      {
        id: "pledge-busan-02",
        title: "청년 유출 완화",
        summary: "지역 대학과 기업 채용을 묶은 정착 지원 프로그램",
        category: "청년",
        details: ["지역 채용 매칭", "창업 공간 제공", "주거비 보조"]
      }
    ],
    material: {
      status: "pending",
      dominantColors: [],
      fontNotes: "공보물 수집 후 분석 예정",
      layoutNotes: "공보물 수집 후 분석 예정"
    },
    source: {
      candidateApiId: "mock-1000000003",
      pledgeApiId: "mock-1000000003"
    }
  },
  {
    id: "mock-mayor-seoul-01",
    electionId: "20260603",
    electionName: "제9회 전국동시지방선거",
    officeType: "municipal_mayor",
    officeName: "서울특별시 강남구청장",
    regionName: "서울특별시",
    districtName: "강남구",
    partyName: "샘플정당",
    candidateName: "강남구청장 샘플 후보",
    ballotNumber: "1",
    status: "mock",
    age: 49,
    gender: "여",
    job: "지방의원",
    education: "사회복지학 석사",
    careers: ["전 구의회 의장", "전 주민참여예산위원"],
    pledges: [
      {
        id: "pledge-gangnam-01",
        title: "생활 안전망 강화",
        summary: "보행, 치안, 재난 대응을 생활권 단위로 정비",
        category: "안전",
        details: ["어두운 골목 조명 개선", "침수 취약지 점검", "CCTV 사각지대 축소"]
      },
      {
        id: "pledge-gangnam-02",
        title: "동네 의료 접근성",
        summary: "어르신과 장애인 이동 진료 연계를 확대",
        category: "보건",
        details: ["방문 건강관리", "재활 프로그램", "보건소 예약 개선"]
      }
    ],
    material: {
      status: "pending",
      dominantColors: [],
      fontNotes: "공보물 수집 후 분석 예정",
      layoutNotes: "공보물 수집 후 분석 예정"
    },
    source: {
      candidateApiId: "mock-1000000004",
      pledgeApiId: "mock-1000000004"
    }
  },
  {
    id: "mock-mayor-gyeonggi-01",
    electionId: "20260603",
    electionName: "제9회 전국동시지방선거",
    officeType: "municipal_mayor",
    officeName: "경기도 수원시장",
    regionName: "경기도",
    districtName: "수원시",
    partyName: "미래샘플당",
    candidateName: "수원시장 샘플 후보",
    ballotNumber: "2",
    status: "mock",
    age: 52,
    gender: "남",
    job: "전 공공기관장",
    education: "경제학 학사",
    careers: ["전 수원시 정책보좌관", "전 지역경제연구원"],
    pledges: [
      {
        id: "pledge-suwon-01",
        title: "동서 교통축 개선",
        summary: "구도심과 신도시를 연결하는 버스, 보행, 자전거망 정비",
        category: "교통",
        details: ["간선버스 조정", "보행 안전섬", "자전거 연결로"]
      },
      {
        id: "pledge-suwon-02",
        title: "지역 창업 실험실",
        summary: "상권 빈 점포를 창업 실험 공간으로 전환",
        category: "경제",
        details: ["빈 점포 매칭", "초기 임대료 지원", "실증 판매전"]
      },
      {
        id: "pledge-suwon-03",
        title: "공공데이터 민원지도",
        summary: "반복 민원을 지도화해 부서별 처리 우선순위를 공개",
        category: "행정",
        details: ["민원 대시보드", "처리 지연 알림", "분기별 개선 보고"]
      }
    ],
    material: {
      status: "collected",
      pageCount: 10,
      dominantColors: ["#2357d8", "#ffcf3a", "#ffffff"],
      fontNotes: "숫자 강조용 굵은 제목체와 넓은 행간의 설명문",
      layoutNotes: "지도 이미지와 정책 번호를 결합한 내비게이션형 구성"
    },
    source: {
      candidateApiId: "mock-1000000005",
      pledgeApiId: "mock-1000000005",
      fetchedAt: "2026-06-01T00:00:00+09:00"
    }
  },
  {
    id: "mock-education-gyeonggi-01",
    electionId: "20260603",
    electionName: "제9회 전국동시지방선거",
    officeType: "education_superintendent",
    officeName: "경기도교육감",
    regionName: "경기도",
    partyName: "교육감 후보",
    candidateName: "경기교육감 샘플 후보",
    ballotNumber: "3",
    status: "mock",
    age: 57,
    gender: "여",
    job: "교육행정가",
    education: "교육학 박사",
    careers: ["전 초등학교 교장", "전 교육청 정책국장"],
    pledges: [
      {
        id: "pledge-edu-gyeonggi-01",
        title: "돌봄 공백 해소",
        summary: "방과후와 방학 돌봄을 지역 자원과 통합 운영",
        category: "돌봄",
        details: ["방학 돌봄 확대", "지역아동센터 연계", "긴급돌봄 신청 간소화"]
      },
      {
        id: "pledge-edu-gyeonggi-02",
        title: "기초학력 책임제",
        summary: "학년 전환기 진단과 맞춤형 보충 수업을 제공",
        category: "교육",
        details: ["학습 진단", "소그룹 보충", "학부모 피드백"]
      },
      {
        id: "pledge-edu-gyeonggi-03",
        title: "학교 안전 리모델링",
        summary: "노후 교실과 통학로 위험 요소를 우선 정비",
        category: "안전",
        details: ["노후 교실 점검", "통학로 정비", "실내 공기질 관리"]
      }
    ],
    material: {
      status: "pending",
      dominantColors: [],
      fontNotes: "공보물 수집 후 분석 예정",
      layoutNotes: "공보물 수집 후 분석 예정"
    },
    source: {
      candidateApiId: "mock-1000000006",
      pledgeApiId: "mock-1000000006"
    }
  },
  {
    id: "mock-education-chungbuk-01",
    electionId: "20260603",
    electionName: "제9회 전국동시지방선거",
    officeType: "education_superintendent",
    officeName: "충청북도교육감",
    regionName: "충청북도",
    partyName: "교육감 후보",
    candidateName: "충북교육감 샘플 후보",
    ballotNumber: "4",
    status: "mock",
    age: 60,
    gender: "남",
    job: "교수",
    education: "교육정책학 박사",
    careers: ["전 교원연수원장", "전 교육과정 심의위원"],
    pledges: [
      {
        id: "pledge-edu-chungbuk-01",
        title: "농산어촌 작은학교 지원",
        summary: "작은학교 공동교육과정을 만들고 통학 지원을 강화",
        category: "지역교육",
        details: ["공동 수업", "통학버스 개선", "원격수업 장비"]
      },
      {
        id: "pledge-edu-chungbuk-02",
        title: "디지털 수업 역량",
        summary: "교사 연수와 학생 기기 지원을 함께 추진",
        category: "디지털",
        details: ["교사 연수", "기기 관리", "AI 학습 도구 검증"]
      }
    ],
    material: {
      status: "pending",
      dominantColors: [],
      fontNotes: "공보물 수집 후 분석 예정",
      layoutNotes: "공보물 수집 후 분석 예정"
    },
    source: {
      candidateApiId: "mock-1000000007",
      pledgeApiId: "mock-1000000007"
    }
  }
];
