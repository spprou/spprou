import pandas as pd
from tabulate import tabulate  # 표로 출력하기 위한 라이브러리

# 엑셀 파일 경로
file_path = r'E:/내 문서/# 대학원/[24-2]스마트팩토리 플렛폼과 설계/프로젝트1(중간고사)/스마트팩토리_프로젝트1/MRP_입력정보.xlsx'

# 엑셀 파일의 각 시트 불러오기
xls = pd.ExcelFile(file_path)

# 1번탭, 2번탭, 3번탭의 데이터를 불러오기
mps_df = pd.read_excel(xls, sheet_name=0, skiprows=1)
bom_df = pd.read_excel(xls, sheet_name=1, skiprows=1)
irf_df = pd.read_excel(xls, sheet_name=2, skiprows=1)

# 열 이름 설정
mps_df.columns = ['Item', 'Product Name', 'Quantity', 'Due Week']
bom_df.columns = ['Parent', 'Child', 'Qty']
irf_df.columns = ['Item', 'On Hand', 'Lead Time', 'Safety Stock', 'Scheduled Receipts', 'Week of Receipts', 'Order Qty']


# LLC 계산 함수
def calculate_llc(bom_df):
    llc = {}

    def assign_llc(parent, level):
        if parent in llc:
            llc[parent] = max(llc[parent], level)
        else:
            llc[parent] = level

        children = bom_df[bom_df['Parent'] == parent]['Child']
        for child in children:
            assign_llc(child, level + 1)

    top_items = set(bom_df['Parent']) - set(bom_df['Child'])
    for item in top_items:
        assign_llc(item, 0)

    return llc


# LLC 계산
llc = calculate_llc(bom_df)
llc_df = pd.DataFrame(list(llc.items()), columns=['Item', 'LLC']).sort_values(by='LLC')


# MRP 계산 함수
def calculate_mrp_for_all(llc_df, mps_df, irf_df, bom_df):
    mrp_results = {}

    for item in llc_df['Item']:
        on_hand = irf_df.loc[irf_df['Item'] == item, 'On Hand'].values[0]
        lead_time = irf_df.loc[irf_df['Item'] == item, 'Lead Time'].values[0]
        safety_stock = irf_df.loc[irf_df['Item'] == item, 'Safety Stock'].values[0]
        scheduled_receipts = irf_df.loc[irf_df['Item'] == item, 'Scheduled Receipts'].values[0]
        week_of_receipts = irf_df.loc[irf_df['Item'] == item, 'Week of Receipts'].values[0]

        gross_requirements = []
        for week in range(4, 18):
            mps_for_item = mps_df[(mps_df['Item'] == item) & (mps_df['Due Week'] == week)]
            if not mps_for_item.empty:
                gross_requirements.append(mps_for_item['Quantity'].values[0])
            else:
                gross_requirements.append(0)

        net_requirements = []
        planned_order_releases = []
        projected_available = []

        available_inventory = on_hand
        for week, requirement in enumerate(gross_requirements):
            if week + 4 == week_of_receipts:
                available_inventory += scheduled_receipts

            projected_available.append(available_inventory - requirement)

            if projected_available[-1] < safety_stock:
                net_req = safety_stock - projected_available[-1]
                net_requirements.append(net_req)

                if week - lead_time >= 0:
                    planned_order_releases.append(net_req)
                    available_inventory += net_req
                else:
                    planned_order_releases.append(0)
            else:
                net_requirements.append(0)
                planned_order_releases.append(0)

            available_inventory -= requirement

        mrp_results[item] = {
            'Gross Requirements': gross_requirements,
            'Projected Available': projected_available,
            'Net Requirements': net_requirements,
            'Planned Order Releases': planned_order_releases
        }

    return mrp_results


# MRP 결과를 DataFrame으로 변환하는 함수
def convert_mrp_to_dataframe(mrp_results, item):
    df = pd.DataFrame({
        'Week': list(range(4, 18)),
        'Gross Requirements': mrp_results[item]['Gross Requirements'],
        'Projected Available': mrp_results[item]['Projected Available'],
        'Net Requirements': mrp_results[item]['Net Requirements'],
        'Planned Order Releases': mrp_results[item]['Planned Order Releases']
    })
    return df


# MRP 계산
mrp_results = calculate_mrp_for_all(llc_df, mps_df, irf_df, bom_df)

# A, B, C, D 품목에 대한 MRP 결과를 DataFrame으로 변환
mrp_A_df = convert_mrp_to_dataframe(mrp_results, 'A')
mrp_B_df = convert_mrp_to_dataframe(mrp_results, 'B')
mrp_C_df = convert_mrp_to_dataframe(mrp_results, 'C')
mrp_D_df = convert_mrp_to_dataframe(mrp_results, 'D')

# tabulate를 사용해 표로 출력
print("MRP for Item A:\n", tabulate(mrp_A_df, headers='keys', tablefmt='grid'))
print("\nMRP for Item B:\n", tabulate(mrp_B_df, headers='keys', tablefmt='grid'))
print("\nMRP for Item C:\n", tabulate(mrp_C_df, headers='keys', tablefmt='grid'))
print("\nMRP for Item D:\n", tabulate(mrp_D_df, headers='keys', tablefmt='grid'))
