require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'RunstampVideoEncoder'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = 'AGPL-3.0'
  s.author         = 'Runstamp'
  s.homepage       = 'https://github.com/Rohithgilla12/runstamp'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
