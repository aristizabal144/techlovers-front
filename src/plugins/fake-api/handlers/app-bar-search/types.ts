export interface SearchResults {
  title: string
  children: SearchResultItem[]
}

export interface SearchResultItem {
  title: string
  url: string
  icon: string
}
