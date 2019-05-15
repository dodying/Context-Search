# Context Search

A Firefox WebExtension that displays a context menu item with user defined
search engines, that searches for the selected text.

Download and read how to use at
https://addons.mozilla.org/firefox/addon/context-search-we/


### 修改内容

#### 新标签页搜索

(需反注释`chrome_url_overrides`)

#### omnibox搜索

关键词 `` ` `` (反引号)

例子1:
```
书签标题: 百度(&B)
书签网址: https://www.baidu.com/s?wd=%s
输入: ` B test
结果: 打开 https://www.baidu.com/s?wd=test
```

例子2:
```
书签标题: 百度
书签网址: https://www.baidu.com/s?wd=%s
输入: ` b test
建议: 使用 百度 搜索: test
选中后输入结果为: www.baidu.com test
结果: 打开 https://www.baidu.com/s?wd=test
```
