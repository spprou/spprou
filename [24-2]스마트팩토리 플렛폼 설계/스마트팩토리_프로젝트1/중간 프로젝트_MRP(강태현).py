import pandas as pd
from tabulate import tabulate

# A와 B의 자재 정보 및 리드타임을 정의
# 각 제품(A와 B)에 필요한 자재와 리드타임을 딕셔너리 형태로 정의합니다.
materials = {
    'A': {
        '3"290 ABS core': {'필요수량': 1, '리드타임': 2},
        '3" 싱글케이스': {'필요수량': 1, '리드타임': 3},
        '3" 홀더': {'필요수량': 2, '리드타임': 3},
        '1100박스': {'필요수량': 1, '리드타임': 2},
        '750알루미늄 파우치': {'필요수량': 1, '리드타임': 4},
    },
    'B': {
        '6"600 지관': {'필요수량': 1, '리드타임': 3},
        '770박스': {'필요수량': 1, '리드타임': 2},
        '320디스크': {'필요수량': 1, '리드타임': 4},
        '6"640 중심봉': {'필요수량': 1, '리드타임': 2},
        '6"20 연마지관': {'필요수량': 1, '리드타임': 3},
        '블론필름': {'필요수량': 1, '리드타임': 3},
        '770알루미늄 파우치': {'필요수량': 1, '리드타임': 3},
    }
}

# A와 B의 생산일정을 정의
# 각 주에 A와 B 제품이 얼마나 생산되는지를 리스트로 정의합니다.
production_schedule = {
    'A': [768, 768, 1536, 768, 384, 1536, 768, 768, 1536, 768],
    'B': [384, 768, 384, 384, 384, 768, 768, 384, 768, 768]
}


# 주별 MRP 데이터를 생성하는 함수 정의
# 각 제품과 자재에 대해 MRP 결과를 계산합니다.
def calculate_mrp(materials, production_schedule, weeks_range):
    mrp_result = {}  # MRP 결과를 저장할 딕셔너리

    # 각 제품(A와 B)에 대해 반복
    for product, schedule in production_schedule.items():
        product_materials = materials[product]
        mrp_result[product] = {}

        # 각 자재별로 MRP를 계산
        for material, info in product_materials.items():
            lead_time = info['리드타임']  # 자재별 리드타임
            required_amount = info['필요수량']  # 자재별 필요한 수량

            # 각 주에 대해 MRP 테이블을 계산
            gross_requirements = [amount * required_amount for amount in schedule]  # 총소요량
            scheduled_receipts = [0] * len(weeks_range)  # 예정입고 (초기값은 0)
            projected_available = [0] * len(weeks_range)  # 예상재고 (초기값은 0)
            net_requirements = [0] * len(weeks_range)  # 순소요량
            planned_order_receipts = [0] * len(weeks_range)  # 계획수주
            planned_order_releases = [0] * len(weeks_range)  # 계획발주

            # 주차별로 MRP를 계산
            for week in range(len(weeks_range)):
                # 예상재고는 전 주의 예상재고에서 소요량을 차감하여 계산
                if week == 0:
                    projected_available[week] = 0  # 첫 주의 예상재고는 0으로 설정
                else:
                    projected_available[week] = max(
                        projected_available[week - 1] + scheduled_receipts[week] - gross_requirements[week], 0)

                # 순소요량은 총소요량에서 예상재고를 차감한 값
                net_requirements[week] = max(gross_requirements[week] - projected_available[week], 0)

                # 순소요량이 있을 경우 계획수주와 계획발주를 계산
                if net_requirements[week] > 0:
                    planned_order_receipts[week] = net_requirements[week]
                    # 리드타임을 고려하여 계획발주 시점을 결정
                    if week - lead_time >= 0:
                        planned_order_releases[week - lead_time] = net_requirements[week]

            # 자재별 MRP 결과를 저장
            mrp_result[product][material] = {
                '총소요량': gross_requirements,
                '예정입고': scheduled_receipts,
                '예상재고': projected_available,
                '순소요량': net_requirements,
                '계획수주': planned_order_receipts,
                '계획발주': planned_order_releases
            }

    return mrp_result  # 계산된 MRP 결과를 반환


# MRP 결과를 표로 출력하는 함수
# 제품명, 자재명, 각 주별 MRP 계산 결과를 보기 좋게 출력합니다.
def print_mrp_results_table(mrp_result, weeks_range):
    # 테이블의 헤더를 정의
    headers = ['제품명', '자재명', '구분'] + [f'{week}주' for week in weeks_range]
    table_data = []

    # 각 제품에 대해 반복
    for product, materials in mrp_result.items():
        # 각 자재에 대해 반복
        for material, data in materials.items():
            # 총소요량, 예정입고, 예상재고, 순소요량, 계획수주, 계획발주를 출력
            for category in ['총소요량', '예정입고', '예상재고', '순소요량', '계획수주', '계획발주']:
                row = [product, material, category] + data[category]  # 한 행에 데이터를 추가
                table_data.append(row)

    # tabulate를 사용해 데이터를 표 형식으로 출력
    print(tabulate(table_data, headers=headers, tablefmt='grid'))


# 주 범위 설정 (1주부터 10주까지)
weeks_range = list(range(1, 11))

# MRP 계산 실행 (자재와 생산 스케줄에 기반하여 MRP 결과 계산)
mrp_result = calculate_mrp(materials, production_schedule, weeks_range)

# MRP 결과 출력 (표 형식으로 출력)
print_mrp_results_table(mrp_result, weeks_range)
