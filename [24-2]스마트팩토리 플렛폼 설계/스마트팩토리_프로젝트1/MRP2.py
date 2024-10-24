import pandas as pd
from tabulate import tabulate


# MRP 계산을 위한 함수 정의
def calculate_mrp(mps, inventory, lead_time, weeks_range):
    mrp_result = {item: {
        'Gross Requirements': [0] * len(weeks_range),
        'Scheduled Receipts': [0] * len(weeks_range),
        'Projected Available': [0] * len(weeks_range),
        'Net Requirements': [0] * len(weeks_range),
        'Planned Order Receipts': [0] * len(weeks_range),
        'Planned Order Releases': [0] * len(weeks_range)}
        for item in mps['품목코드']}

    # 현재 재고 및 입고 예정 정보 설정
    for i, row in inventory.iterrows():
        item = row['품목코드']
        if item in mrp_result:
            mrp_result[item]['Projected Available'][0] = row['현재재고']
            if not pd.isna(row['예정입고량']):
                receipt_week = int(row['예정입고일']) - 4
                if 0 <= receipt_week < len(weeks_range):
                    mrp_result[item]['Scheduled Receipts'][receipt_week] = row['예정입고량']

    # Gross Requirements 설정
    for i, row in mps.iterrows():
        item = row['품목코드']
        if item in mrp_result:
            due_week = row['납기'] - 4
            if 0 <= due_week < len(weeks_range):
                mrp_result[item]['Gross Requirements'][due_week] = row['수량']

    # MRP 계산
    for item, values in mrp_result.items():
        for week in range(len(weeks_range)):
            gross_req = values['Gross Requirements'][week]
            if week == 0:
                projected_available = values['Projected Available'][0]
            else:
                projected_available = mrp_result[item]['Projected Available'][week - 1]

            scheduled_receipts = values['Scheduled Receipts'][week]
            projected_available += scheduled_receipts

            net_req = max(gross_req - projected_available, 0)
            values['Net Requirements'][week] = net_req

            # 계획수주 및 계획발주 계산
            if net_req > 0:
                values['Planned Order Receipts'][week] = net_req
                release_week = week - lead_time[item]
                if release_week >= 0:
                    values['Planned Order Releases'][release_week] = net_req

            projected_available = projected_available - gross_req
            if projected_available < 0:
                projected_available = 0
            values['Projected Available'][week] = projected_available

    return mrp_result


# 엑셀 파일 경로
file_path = 'E:/내 문서/# 대학원/[24-2]스마트팩토리 플렛폼과 설계/프로젝트1(중간고사)/스마트팩토리_프로젝트1/MRP_입력정보.xlsx'  # 실제 파일 경로로 수정해야 합니다.

# 각 탭의 데이터를 불러오기
sheet_1 = pd.read_excel(file_path, sheet_name=0)
sheet_3 = pd.read_excel(file_path, sheet_name=2)

# 데이터를 정리하여 필요한 값 추출
mps = sheet_1.dropna().iloc[1:]
mps.columns = ['품목코드', '품목명', '수량', '납기']

inventory = sheet_3.dropna().iloc[1:]
inventory.columns = ['품목코드', '현재재고', '인도기간', '안전재고', '예정입고량', '예정입고일', '주문량']

# 인도기간 정보를 설정 (A는 2주, B는 2주, C는 1주, D는 1주)
lead_time = {
    'A': 2,
    'B': 2,
    'C': 1,
    'D': 1
}

# 주 범위 (4주부터 9주까지 계산)
weeks_range = list(range(4, 10))
mrp_result = calculate_mrp(mps, inventory, lead_time, weeks_range)

# 계산된 MRP 결과를 DataFrame으로 변환
mrp_df = pd.DataFrame.from_dict({(item, key): mrp_result[item][key]
                                 for item in mrp_result.keys()
                                 for key in mrp_result[item].keys()},
                                orient='index').transpose()

# tabulate를 사용하여 표로 출력
print(tabulate(mrp_df, headers='keys', tablefmt='grid'))

# CSV 파일로 저장
mrp_df.to_csv('mrp_result.csv', index=False)

print("MRP 결과가 'mrp_result.csv' 파일로 저장되었습니다.")
