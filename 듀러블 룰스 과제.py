from durable.lang import *

with ruleset('battery_separator'):
    # 규칙1 : LiBS = separator, No_coating
    @when_all((m.type == 'order') & (m.customer == 'our_company')  & (m.separator == 'LiBS') & (m.coating == 'No_coating'))
    def rule_1(c):
        print('주문내역 {0}: 자사에서 만든 LiBS 제품입니다. 아직 판매제품이 아닙니다.'.format(c.m.order_id))

    # 규칙2 : CCS = separator, coating
    @when_all((m.type == 'order') & (m.customer == 'our_company') & (m.separator == 'CCS') & (m.coating == 'coating'))
    def rule_2(c):
        print('주문내역 {0}: 자사에서 만든 CCS 제품입니다. 아직 판매제품이 아닙니다.'.format(c.m.order_id))

    # 규칙3 : LC0302 = LG, LiBS, 길이300
    @when_all((m.type == 'order') & (m.customer == 'LG') & (m.separator == 'LiBS') & (m.width == 300))
    def rule_3(c):
        print('주문내역 {0}: LG / LC0302 제품입니다.'.format(c.m.order_id))

    # 규칙4 : LC0601 = LG, LiBS, 길이600
    @when_all((m.type == 'order') & (m.customer == 'LG') & (m.separator == 'LiBS') & (m.width == 600))
    def rule_4(c):
        print('주문내역 {0}: LG / LC0601 제품입니다.'.format(c.m.order_id))

    # 규칙5 : SS1310 = SAMSUNG, LiBS, 길이 300
    @when_all((m.type == 'order') & (m.customer == 'SAMSUNG') & (m.separator == 'LiBS') & (m.width == 300))
    def rule_5(c):
        print('주문내역 {0}: SAMSUNG / SS1310 제품입니다.'.format(c.m.order_id))

    # 규칙6 : LC0905 = LG, LiBS, 길이 1100
    @when_all((m.type == 'order') & (m.customer == 'LG') & (m.separator == 'LiBS') & (m.width == 1100))
    def rule_6(c):
        print('주문내역 {0}: LG / LC0905 제품입니다.'.format(c.m.order_id))

    # 규칙7 : MR1501 = MURATA, LiBS, 길이 1500
    @when_all((m.type == 'order') & (m.customer == 'MURATA') & (m.separator == 'LiBS') & (m.width == 1500))
    def rule_7(c):
        print('주문내역 {0}: MURATA / MR1501 제품입니다.'.format(c.m.order_id))

    # 규칙8 : LC0600 = LG, CCS, 길이600
    @when_all((m.type == 'order') & (m.customer == 'LG') & (m.separator == 'CCS') & (m.width == 600))
    def rule_8(c):
        print('주문내역 {0}: LG / LC0600 제품입니다.'.format(c.m.order_id))

    # 규칙9 : D29KG = SK, CCS, 길이290
    @when_all((m.type == 'order') & (m.customer == 'SK') & (m.separator == 'CCS') & (m.width == 290))
    def rule_9(c):
        print('주문내역 {0}: SK / D29KG 제품입니다.'.format(c.m.order_id))

    # 규칙10 : D60KG = SK, CCS, 길이600
    @when_all((m.type == 'order') & (m.customer == 'SK') & (m.separator == 'CCS') & (m.width == 600))
    def rule_10(c):
        print('주문내역 {0}: SK / D60KG 제품입니다.'.format(c.m.order_id))

    # 규칙11 : TT0035 = TESLA, CCS, 길이350
    @when_all((m.type == 'order') & (m.customer == 'TESLA') & (m.separator == 'CCS') & (m.width == 350))
    def rule_11(c):
        print('주문내역 {0}: TESLA / TT0035 제품입니다.'.format(c.m.order_id))

    # 규칙12 : TT0050 = TESLA, CCS, 길이500
    @when_all((m.type == 'order') & (m.customer == 'TESLA') & (m.separator == 'CCS') & (m.width == 500))
    def rule_12(c):
        print('주문내역 {0}: TESLA / TT0050 제품입니다.'.format(c.m.order_id))

    # 규칙13 : SSS0072 = SAMSUNG, CCS, 길이 72
    @when_all((m.type == 'order') & (m.customer == 'SAMSUNG') & (m.separator == 'CCS') & (m.width == 72))
    def rule_13(c):
        print('주문내역 {0}: SAMSUNG / SSS0072 제품입니다.'.format(c.m.order_id))

    # 규칙14 : SSS0100 = SAMSUNG, CCS, 길이 1000
    @when_all((m.type == 'order') & (m.customer == 'SAMSUNG') & (m.separator == 'CCS') & (m.width == 1000))
    def rule_14(c):
        print('주문내역 {0}: SAMSUNG / SSS0100 제품입니다.'.format(c.m.order_id))

    # 규칙15 : BY0250 = BYD, CCS, 길이250
    @when_all((m.type == 'order') & (m.customer == 'BYD') & (m.separator == 'CCS') & (m.width == 250))
    def rule_15(c):
        print('주문내역 {0}: BYD / BY0250 제품입니다.'.format(c.m.order_id))

# 주문 내역
order_list = [
    {'type': 'order', 'order_id': 1, 'customer': 'LG', 'separator': 'LiBS', 'coating': 'No_coating', 'width': 300},
    {'type': 'order', 'order_id': 2, 'customer': 'LG', 'separator': 'LiBS', 'coating': 'No_coating', 'width': 600},
    {'type': 'order', 'order_id': 3, 'customer': 'SAMSUNG', 'separator': 'LiBS', 'coating': 'No_coating', 'width': 300},
    {'type': 'order', 'order_id': 4, 'customer': 'LG', 'separator': 'LiBS', 'coating': 'No_coating', 'width': 1100},
    {'type': 'order', 'order_id': 5, 'customer': 'MURATA', 'separator': 'LiBS', 'coating': 'No_coating', 'width': 1500},
    {'type': 'order', 'order_id': 6, 'customer': 'LG', 'separator': 'CCS', 'coating': 'coating', 'width': 600},
    {'type': 'order', 'order_id': 7, 'customer': 'SK', 'separator': 'CCS', 'coating': 'coating', 'width': 290},
    {'type': 'order', 'order_id': 8, 'customer': 'SK', 'separator': 'CCS', 'coating': 'coating', 'width': 600},
    {'type': 'order', 'order_id': 9, 'customer': 'TESLA', 'separator': 'CCS', 'coating': 'coating', 'width': 350},
    {'type': 'order', 'order_id': 10, 'customer': 'TESLA', 'separator': 'CCS', 'coating': 'coating', 'width': 500},
    {'type': 'order', 'order_id': 11, 'customer': 'SAMSUNG', 'separator': 'CCS', 'coating': 'coating', 'width': 72},
    {'type': 'order', 'order_id': 12, 'customer': 'SAMSUNG', 'separator': 'CCS', 'coating': 'coating', 'width': 1000},
    {'type': 'order', 'order_id': 13, 'customer': 'BYD', 'separator': 'CCS', 'coating': 'coating', 'width': 250},
    {'type': 'order', 'order_id': 14, 'customer': 'our_company', 'separator': 'LiBS', 'coating': 'No_coating'},
    {'type': 'order', 'order_id': 15, 'customer': 'our_company', 'separator': 'CCS', 'coating': 'coating'}
]

for order in order_list:
    post('battery_separator', order)
